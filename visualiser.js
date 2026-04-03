canvas.style.background = "#eee8d5";
const ctx = canvas.getContext("2d");
if (!ctx) throw("Error: Could not initialize 2d context");

let graph;

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  sub(v) {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  mul(s) {
    return new Vector2(this.x * s, this.y * s);
  }

  div(s) {
    return new Vector2(this.x / s, this.y / s);
  }

  addInPlace(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  subInPlace(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mulInPlace(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  divInPlace(s) {
    this.x /= s;
    this.y /= s;
    return this;
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  dist(v) {
    return Math.sqrt(this.distSq(v));
  }

  clone() {
    return new Vector2(this.x, this.y);
  }

  static lerp(a, b, t) {
    return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  static dist(a, b) {
    return a.dist(b);
  }
}

const POINT_COLOR = "#dc322f";
const TEXT_COLOR  = "#cb4b16";
const LINE_TEXT_COLOR = "#d33682";
const LINE_COLOR  = "#93a1a1";
const BOX_COLOR   = "#fdf6e3";
const MAX_ITERATIONS = 1000;
const STEP = 1 / MAX_ITERATIONS;
const EPSILON = 10;
let RADIUS = 10;
let IDEAL_DISTANCE = 70;
let FONT_SIZE = 13;
let BOX_PADDING = 10;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function draw_line(start, end, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function dist(a, b) {
  return a.dist(b);
}

function connectCircle(a, r1, b, r2) {
  const d = dist(a, b);
  const start = new Vector2(
    a.x + (r1 * (b.x - a.x)) / d,
    a.y + (r1 * (b.y - a.y)) / d
  );
  const end = new Vector2(
    b.x - (r2 * (b.x - a.x)) / d,
    b.y - (r2 * (b.y - a.y)) / d
  );
  draw_line(start, end);
}

function draw_rect(pos, w, h) {
  ctx.fillStyle = BOX_COLOR;
  ctx.fillRect(pos.x, pos.y, w, h);
}

function draw_text(pos, text, color) {
  ctx.fillStyle = color;
  ctx.fillText(text, pos.x, pos.y);
}

function draw_circle(ctx, pos, radius, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

let prev_time = null;
let dt = null;
let speed = 0.0002;
let iteration = 0;
let nodes = [];
let origin = new Vector2(0, 0);
let scale = 1;
let zoom = 0;

function frame() {
  nodes = [];
  let cur_time = Date.now();
  if (prev_time) {
    dt = cur_time - prev_time;
  }
  prev_time = cur_time;

  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset everything to default state
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(origin.x, origin.y);
  ctx.scale(scale, scale);
  ctx.font = `${FONT_SIZE}px serif`;

  const draw = (node, parent) => {
    node.adjacents = [];
    nodes.push(node);

    draw_circle(ctx, node.position, RADIUS, POINT_COLOR);

    for (const [key, value] of Object.entries(node.value)) {
      if (value.type === "object" || value.type === "array") {
        draw(value, node);
        connectCircle(node.position, RADIUS, value.position, RADIUS);
        const mid = Vector2.lerp(node.position, value.position, 0.5);
        draw_text(mid, key, LINE_TEXT_COLOR);
        node.adjacents.push(value);
      }
    }
  }

  draw(graph);

  for (const node of nodes) {
    if (node.is_hovered) {
      const texts = [];

      if (node.type === "array") {
        for (const value of node.value) {
          if (isObject(value)) {
            const len = Object.values(value.value).length;
            value = `[${len} ${len > 1 ? "keys" : "key" }]`;
          } else if (Array.isArray(value)) {
            const len = value.length;
            value = `[${len} ${len > 1 ? "items" : "item"}]`;
          }

          texts.push(value);
        }
      } else if (node.type === "object") {
        for (let [k, v] of Object.entries(node.value)) {
          if (isObject(v)) {
            const len = Object.values(v.value).length;
            v = `[${len} ${len > 1 ? "keys" : "key" }]`;
          } else if (Array.isArray(v)) {
            const len = v.length;
            v = `[${len} ${len > 1 ? "items" : "item"}]`;
          }

          texts.push(`${k}: ${v}`);
        }
      }

      const max_text_w = Math.max(...texts.map(t => ctx.measureText(t).width)) + BOX_PADDING * 2;
      const max_text_h = texts.length * FONT_SIZE + BOX_PADDING * 2;
      draw_rect(node.position, max_text_w, max_text_h);

      let y_pos = node.position.y + FONT_SIZE + BOX_PADDING;
      for (const text of texts) {
        draw_text(new Vector2(node.position.x + BOX_PADDING, y_pos), text, TEXT_COLOR);
        y_pos += FONT_SIZE;
      }
    }
  }

  if (iteration <= MAX_ITERATIONS) {
    const frs = [];
    const fas = [];

    for (let i = 0; i < nodes.length; i++) {
        // fr: Repulsive force between one vertex against all the other vertices
        let fr = new Vector2(0, 0);
        for (let j = 0; j < nodes.length; j++) {
          if (j == i) continue;
          const delta = nodes[i].position.sub(nodes[j].position);
          const dist = Math.sqrt(delta.lengthSq() + EPSILON);
          const force = IDEAL_DISTANCE * IDEAL_DISTANCE / dist;
          fr.addInPlace(delta.mul(force / dist));
        }
        frs.push(fr);

        // fa: Attraction force between adjacent nodes
        let fa = new Vector2(0, 0);
        for (const v_adj of nodes[i].adjacents) {
          const delta = v_adj.position.sub(nodes[i].position);
          const dist = Math.sqrt(delta.lengthSq() + EPSILON);
          const force = dist * dist / IDEAL_DISTANCE;
          fa.addInPlace(delta.mul(force / dist));
        }
        fas.push(fa);
    }

    const cooling_factor = lerp(1, 0, STEP * iteration);
    for (let i = 0; i < nodes.length; i++) {
      const totalForce = frs[i].add(fas[i]);
      nodes[i].position.addInPlace(totalForce.mul(dt * speed * cooling_factor));
    }
    iteration += 1;
  }

  requestAnimationFrame(frame);
}

function isObject(item) {
  return typeof item === "object" && !Array.isArray(item) && item !== null;
}

json = `{
    "GlossDiv3": {
      "title": "S",
      "GlossList": {
        "GlossEntry": {
          "ID": "SGML",
          "SortAs": "SGML",
          "GlossTerm": "Standard Generalized Markup Language",
          "Acronym": "SGML",
          "Abbrev": "ISO 8879:1986",
          "GlossDef": {
            "para": "A meta-markup language, used to create markup languages such as DocBook.",
            "GlossSeeAlso": ["GML", "XML"]
          },
          "GlossSee": "markup"
        }
      }
    },
    "GlossDiv1": {
      "title": "S",
      "GlossList": {
        "GlossEntry": {
          "ID": "SGML",
          "SortAs": "SGML",
          "GlossTerm": "Standard Generalized Markup Language",
          "Acronym": "SGML",
          "Abbrev": "ISO 8879:1986",
          "GlossDef": {
            "para": "A meta-markup language, used to create markup languages such as DocBook.",
            "GlossSeeAlso": ["GML", "XML"]
          },
          "GlossSee": "markup"
        }
      }
    },
    "GlossDiv2": {
      "title": "S",
      "GlossList": {
        "GlossEntry": {
          "ID": "SGML",
          "SortAs": "SGML",
          "GlossTerm": "Standard Generalized Markup Language",
          "Acronym": "SGML",
          "Abbrev": "ISO 8879:1986",
          "GlossDef": {
            "para": "A meta-markup language, used to create markup languages such as DocBook.",
            "GlossSeeAlso": ["GML", "XML"]
          },
          "GlossSee": "markup"
        }
      }
    }
}`;

function screenCoordToWorldCoord(pos) {
  return new Vector2((pos.x - origin.x) / scale, (pos.y - origin.y) / scale);
}

function setup() {
  const canvasElem = document.getElementById("canvas");
  if (!canvasElem) throw new Error("oh oh");
  const { width, height } = canvasElem.getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;

  let isPanning = false;
  let lastMousePos = null;

  canvas.addEventListener("mousedown", (e) => {
    isPanning = true;
    lastMousePos = new Vector2(e.offsetX, e.offsetY);
  })

  canvas.addEventListener("mouseup", (e) => {
    isPanning = false;
  })

  canvas.addEventListener("mousemove", (e) => {
    const mousePos = new Vector2(e.offsetX, e.offsetY);

    if (isPanning) {
      origin.addInPlace(mousePos.sub(lastMousePos));
      lastMousePos = mousePos;
    }

    if (nodes.length) {
      for (const node of nodes) {
        node.is_hovered = dist(screenCoordToWorldCoord(mousePos), node.position) < RADIUS;
      }
    }
  })

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const mouse = new Vector2(e.offsetX, e.offsetY);

    zoom = 1 + (-e.deltaY * 0.01);
    origin.x = mouse.x - (mouse.x - origin.x) * zoom;
    origin.y = mouse.y - (mouse.y - origin.y) * zoom;

    scale *= zoom;
  })

  // window.addEventListener('resize', resizeCanvas, false);
  //
  // function resizeCanvas() {
  //   const parent = canvas.parentElement;
  //   canvas.width = parent.clientWidth;
  //   canvas.height = parent.clientHeight;
  //
  //   requestAnimationFrame(frame);
  // }
}

setup();

function run() {
  json = input.value;
  pos  = 0; // Reset parser position;

  const root = parse_object(json);

  const dfs = (value, level) => {
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }

    const r = level * 20;
    const degree = Math.random() * 360;
    const rad = degree * Math.PI / 180;

    if (isObject(value)) {
      const node = {};
      node['type'] = "object";
      node['value'] = {};
      node['position'] = new Vector2(canvas.width / 2 + r * Math.cos(rad), canvas.height / 2 + r * Math.sin(rad));

      for (const [k, v] of Object.entries(value)) {
        node['value'][k] = dfs(v, level + 1);
      }

      return node;
    }

    if (Array.isArray(value)) {
      const node = {};
      node['type'] = "array";
      node['value'] = [];
      node['position'] = new Vector2(canvas.width / 2 + r * Math.cos(rad), canvas.height / 2 + r * Math.sin(rad));

      for (const arrayItem of value) {
        node['value'].push(dfs(arrayItem, level + 1));
      }

      return node;
    }
  }

  graph = dfs(root, 0);
  requestAnimationFrame(frame);
}

