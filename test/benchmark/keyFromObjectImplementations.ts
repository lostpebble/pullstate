function keyFromObjectTemplate(json) {
  if (json == null) {
    return `${json}`;
  }

  if (typeof json !== "object") {
    return `${json}`;
  }

  let prefix = "{";

  for (const key of Object.keys(json).sort()) {
    prefix += key;

    if (typeof json[key] === "undefined") {
      prefix += "(und)";
    } else if (typeof json[key] === "string") {
      prefix += `:${json[key]};`;
    } else if (typeof json[key] === "boolean" || typeof json[key] === "number") {
      prefix += `(${json[key]})`;
    } else {
      prefix += keyFromObjectTemplate(json[key]);
    }
  }

  return prefix + "}";
}

function keyFromObjectConcat(json) {
  if (json == null) {
    return "" + json;
  }

  if (typeof json !== "object") {
    return "" + json;
  }

  let prefix = "{";

  for (const key of Object.keys(json).sort()) {
    prefix += key;

    if (typeof json[key] === "undefined") {
      prefix += "(und)";
    } else if (typeof json[key] === "string") {
      prefix += ":" + json[key] + ";";
    } else if (typeof json[key] === "boolean" || typeof json[key] === "number") {
      prefix += "(" + json[key] + ")";
    } else {
      prefix += keyFromObjectConcat(json[key]);
    }
  }

  return prefix + "}";
}

function keyFromObjectConcatNew(json) {
  if (json === null) {
    return "(n)";
  }

  const typeOf = typeof json;

  if (typeOf !== "object") {
    if (typeOf === "undefined") {
      return "(u)";
    } else if (typeOf === "string") {
      return ":" + json + ";";
    } else if (typeOf === "boolean" || typeOf === "number") {
      return "(" + json + ")";
    }
  }

  let prefix = "{";

  for (const key of Object.keys(json).sort()) {
    prefix += key + keyFromObjectConcatNew(json[key]);
  }

  return prefix + "}";
}

export const keyFromObjectImplementations = {
  keyFromObjectConcat,
  keyFromObjectTemplate,
  keyFromObjectConcatNew,
};
