// jsonObject:
//   "{" jsonKey : jsonValue "}"
//
// jsonArray:
//   "[" jsonValue1, jsonValue2, jsonValue3 "]"
//
// jsonBool:
//   "true" | "false"
//
// jsonValue:
//   string: string
//   number: 0 | 9
//   jsonBool
//   jsonArray
//   jsonObject
//
// jsonKey:
//   string

let pos = 0;

function parse_string() {
  expect("\"");

  let str = "";
  while (pos < json.length && json[pos] !== "\"") {
    // TODO: Escape special characters
    str += json[pos];
    pos++;
  }

  expect("\"", "Quote string not terminated");
  return str;
}

function parse_bool() {
  if (json.slice(pos, pos + 4) === "true") {
    pos += 4;
    return "true";
  }

  if (json.slice(pos, pos + 5) === "false") {
    pos += 5;
    return "false";
  }

  throw new Error(`Invalid token at ${pos}`);
}

function parse_array() {
  const arr = [];

  function parse_array_items() {
    skip_ws();
    if (json[pos] === "]") {
      return arr;
    } else {
      arr.push(parse_value());
      skip_ws();
      if (json[pos] === ",") {
        pos++;
        skip_ws();
        parse_array_items();
      }
    }
  }

  expect("[");
  parse_array_items();
  expect("]");
  return arr;
}

function is_number(token) {
  return "0" <= token && token <= "9";
}

function parse_number() {
  // TODO: Handle floating and negative numbers
  let number = 0;

  let token = json[pos];
  while (isNumber(token)) {
    number *= 10;
    number += parseInt(token);
    token = json[++pos];
  }
  return number;
}

function parse_value() {
  let val;
  if (json[pos] === 't' || json[pos] === 'f') {
    val = parse_bool();
  } else if (json[pos] === "\"") {
    val = parse_string();
  } else if (json[pos] === "[") {
    val = parse_array();
  } else if (json[pos] === "{") {
    val = parse_object();
  } else {
    val = parse_number();
  }

  return val;
}

function expect(char, msg) {
  if (json[pos] !== char) {
    throw new Error(msg || `Expected ${char} but got ${json[pos]} instead at ${pos}`);
  } else {
    pos++;
  }
}

function skip_ws() {
  while (pos < json.length && (json[pos] === " " || json[pos] === "\n")) {
    pos++;
  }
}

function parse_object() {
  skip_ws();
  expect("{");

  const obj = {};
  function parse_key_value() {
    skip_ws();
    const key = parse_string();
    skip_ws();
    expect(":");
    skip_ws();
    const value = parse_value();
    skip_ws();
    obj[key] = value;
    if (json[pos] === ",") {
      pos++;
      parse_key_value();
    }
  }

  parse_key_value();
  expect("}");
  return obj;
}

let json = null;

// async function main() {
//   const args = Bun.argv
//   const path = args[2];
//   if (!path) {
//     console.error("Please provide file path as an argument");
//     return;
//   }
//   const file = Bun.file(path);
//   json = await file.text();
//   console.log(parse_object(json));
// }
//
// await main();
