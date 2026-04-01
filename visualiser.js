canvas.style.background = "#eee8d5";
const ctx = canvas.getContext("2d");
if (!ctx) throw("Error: Could not initialize 2d context");

let graph;

let MAX_ITERATIONS = 1000;
let step = 1 / MAX_ITERATIONS;
let EPSILON = 10;
let RADIUS = 10;
let IDEAL_DISTANCE = 100;

function lerp(x, y, t) {
  return x + (y - x) * t;
}

function drawLine(startPos, endPos, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(startPos.x, startPos.y);
  ctx.lineTo(endPos.x, endPos.y);
  ctx.strokeStyle = "#93a1a1";
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function dist(pos1, pos2) {
  return Math.hypot(pos2.x - pos1.x, pos2.y - pos1.y);
}

function connectCircle(pos1, r1, pos2, r2) {
  const distance = dist(pos1, pos2);
  const start_x = pos1.x + (r1 * (pos2.x - pos1.x)) / distance;
  const start_y = pos1.y + (r1 * (pos2.y - pos1.y)) / distance;
  const end_x = pos2.x - (r2 * (pos2.x - pos1.x)) / distance;
  const end_y = pos2.y - (r2 * (pos2.y - pos1.y)) / distance;
  drawLine({ x: start_x, y: start_y }, { x: end_x, y: end_y });
}

function drawRect(pos, w, h) {
  ctx.fillStyle = "#fdf6e3";
  ctx.fillRect(pos.x, pos.y, w, h);
}

function drawText(text, x, y) {
  ctx.font = "15px serif";
  ctx.fillStyle = "#839496";
  ctx.fillText(text, x, y);
}

function drawCircle(ctx, pos, radius, color) {
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
let mousePos = {x: 0, y: 0};
let nodes = [];

function frame() {
  nodes = [];
  let cur_time = Date.now();
  if (prev_time) {
    dt = cur_time - prev_time;
  }
  prev_time = cur_time;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const draw = (node, parent) => {
    if (node.type === "object") {
      node.adjacents = [];
      nodes.push(node);

      const texts = [];
      for (let [k, v] of Object.entries(node.value)) {
        if (isObject(v)) {
          v = `[${Object.values(v.value).length} items]`;
        } else if (Array.isArray(v)) {
          v = `[${v.length} items]`;
        }

        texts.push(`${k}: ${v}`);
      }

      const padding = 10;
      const max_text_w = Math.max(...texts.map(t => ctx.measureText(t).width)) + padding * 2;
      const max_text_h = texts.length * 15 + padding * 2;

      drawCircle(ctx, node.position, RADIUS, "red");

      if (node.is_hovered) {
        drawRect({x: node.position.x - padding, y: node.position.y - padding}, max_text_w, max_text_h);
        y_pos = node.position.y + 15;
        for (const text of texts) {
          drawText(text, node.position.x, y_pos);
          y_pos += 15;
        }
      }

      for (const value of Object.values(node.value)) {
        if (value.type === "object" || value.type === "array") {
          draw(value, node);
          connectCircle(node.position, RADIUS, value.position, RADIUS);
          node.adjacents.push(value);
        }
      }
    }

    if (node.type === "array") {
      node.adjacents = [];
      nodes.push(node);

      const texts = [];
      for (const value of node.value) {
        if (isObject(value)) {
          value = `[${Object.values(value.value).length} items]`;
        } else if (Array.isArray(value)) {
          value = `[${value.length} items]`;
        }

        texts.push(value);
      }

      const padding = 10;
      const max_text_w = Math.max(...texts.map(t => ctx.measureText(t).width)) + padding * 2;
      const max_text_h = texts.length * 15 + padding * 2;
      drawCircle(ctx, node.position, RADIUS, "red");

      if (node.is_hovered) {
        drawRect({x: node.position.x - padding, y: node.position.y - padding}, max_text_w, max_text_h);
        y_pos = node.position.y + 15;
        for (const text of texts) {
          drawText(text, node.position.x, y_pos);
          y_pos += 15;
        }
      }

      for (const value of Object.values(node.value)) {
        if (value.type === "object" || value.type === "array") {
          draw(value, node);
          connectCircle(node.position, RADIUS, value.position, RADIUS);
          node.adjacents.push(value);
        }
      }
    }
  }

  draw(graph);

  if (iteration <= MAX_ITERATIONS) {
    const frs = [];
    const fas = [];

    for (let i = 0; i < nodes.length; i++) {
        // fr: Repulsive force between one vertex against all the other vertices
        let fr_x = 0;
        let fr_y = 0;
        for (let j = 0; j < nodes.length; j++) {
          if (j == i) continue;
          const dx = nodes[i].position.x - nodes[j].position.x;
          const dy = nodes[i].position.y - nodes[j].position.y;
          const dist = Math.sqrt(dx*dx + dy*dy + EPSILON);
          const fr = IDEAL_DISTANCE*IDEAL_DISTANCE / dist;
          fr_x += (fr * dx) / dist;
          fr_y += (fr * dy) / dist;
        }
        frs.push({fr_x, fr_y});

        // fa: Attraction force between adjacent nodes
        let fa_x = 0;
        let fa_y = 0;
        for (const v_adj of nodes[i].adjacents) {
          const dx = v_adj.position.x - nodes[i].position.x;
          const dy = v_adj.position.y - nodes[i].position.y;
          const dist = Math.sqrt(dx*dx + dy*dy + EPSILON);
          const fa = dist*dist / IDEAL_DISTANCE;
          fa_x += (fa * dx) / dist;
          fa_y += (fa * dy) / dist;
        }
        fas.push({fa_x, fa_y});
    }

    const cooling_factor = lerp(1, 0, step * iteration);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].position.x += (frs[i].fr_x + fas[i].fa_x) * (dt*speed) * cooling_factor;
      nodes[i].position.y += (frs[i].fr_y + fas[i].fa_y) * (dt*speed) * cooling_factor;
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

function main() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  canvas.addEventListener("mousemove", (e) => {
    if (nodes.length) {
      for (const node of nodes) {
        node.is_hovered = dist({x: e.offsetX, y: e.offsetY}, node.position) < RADIUS;
      }
    }
  })

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
      node['position'] = { x: canvas.width / 2 + r * Math.cos(rad), y: canvas.height / 2 + r * Math.sin(rad)};

      for (const [k, v] of Object.entries(value)) {
        node['value'][k] = dfs(v, level + 1);
      }

      return node;
    }

    if (Array.isArray(value)) {
      const node = {};
      node['type'] = "array";
      node['value'] = [];
      node['position'] = { x: canvas.width / 2 + r * Math.cos(rad), y: canvas.height / 2 + r * Math.sin(rad)};

      for (const arrayItem of value) {
        node['value'].push(dfs(arrayItem, level + 1));
      }

      return node;
    }
  }

  graph = dfs(root, 0);

  requestAnimationFrame(frame);

  window.addEventListener('resize', resizeCanvas, false);

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    requestAnimationFrame(frame);
  }
}

main();

