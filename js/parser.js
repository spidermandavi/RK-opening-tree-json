class PGNParser {
  constructor() {
    this.reset();
  }

  reset() {
    this._idCounter = 0;
    this.tokens = [];
    this.index = 0;
    this.resultToken = null;
    this.headerList = [];
    this.headers = {};
    this.root = this.createRoot();
  }

  createRoot() {
    return {
      id: this.generateId("root"),
      type: "root",
      parent: null,
      move: null,
      san: null,
      moveNumber: null,
      color: null,
      comment: "",
      comments: [],
      nags: [],
      variations: [],
      children: [],
      next: null,
      raw: null,
      fenBefore: "",
      fenAfter: "",
      ply: 0
    };
  }

  generateId(prefix = "node") {
    this._idCounter += 1;
    return `${prefix}_${Date.now().toString(36)}_${this._idCounter.toString(36)}`;
  }

  parse(pgn) {
    this.reset();

    if (typeof pgn !== "string") {
      throw new Error("PGN must be a string.");
    }

    const { headers, headerList, movetext } = this.extractHeadersAndMovetext(pgn);

    this.headers = headers;
    this.headerList = headerList;

    const tokens = this.tokenize(movetext);
    this.tokens = tokens;
    this.index = 0;

    this.parseSequence({
      parentNode: this.root,
      inVariation: false
    });

    return {
      metadata: { ...this.headers },
      headers: [...this.headerList],
      result: this.resultToken || this.headers.Result || "*",
      root: this.root,
      moves: this.root.children,
      tokenCount: this.tokens.length
    };
  }

  extractHeadersAndMovetext(pgn) {
    const headers = {};
    const headerList = [];
    const moveLines = [];

    const lines = pgn.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        moveLines.push("");
        continue;
      }

      const headerMatch = trimmed.match(/^\[(\w+)\s+"((?:\\.|[^"])*)"\]$/);
      if (headerMatch) {
        const key = headerMatch[1];
        const value = headerMatch[2]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")
          .replace(/\\\\/g, "\\");

        headers[key] = value;
        headerList.push({ key, value });
        continue;
      }

      moveLines.push(line);
    }

    return {
      headers,
      headerList,
      movetext: moveLines.join("\n").trim()
    };
  }

  tokenize(text) {
    const tokens = [];
    let i = 0;

    while (i < text.length) {
      const ch = text[i];

      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }

      if (ch === "{") {
        const start = i;
        i += 1;
        let depth = 1;

        while (i < text.length && depth > 0) {
          if (text[i] === "{") depth += 1;
          else if (text[i] === "}") depth -= 1;
          i += 1;
        }

        tokens.push(text.slice(start, i));
        continue;
      }

      if (ch === ";") {
        const start = i;
        while (i < text.length && text[i] !== "\n") {
          i += 1;
        }
        tokens.push(text.slice(start, i));
        continue;
      }

      if (ch === "(" || ch === ")") {
        tokens.push(ch);
        i += 1;
        continue;
      }

      if (ch === "$") {
        const start = i;
        i += 1;
        while (i < text.length && /\d/.test(text[i])) {
          i += 1;
        }
        tokens.push(text.slice(start, i));
        continue;
      }

      // Move numbers such as "1." or "1..."
      if (/\d/.test(ch)) {
        const start = i;
        while (i < text.length && /[\d.]/.test(text[i])) {
          i += 1;
        }
        tokens.push(text.slice(start, i));
        continue;
      }

      // General SAN / result / annotation token
      const start = i;
      while (
        i < text.length &&
        !/\s/.test(text[i]) &&
        text[i] !== "(" &&
        text[i] !== ")" &&
        text[i] !== "{" &&
        text[i] !== "}" &&
        text[i] !== ";"
      ) {
        i += 1;
      }

      const token = text.slice(start, i);
      if (token) tokens.push(token);
    }

    return tokens;
  }

  parseSequence({ parentNode, inVariation }) {
    let lastNode = null;

    while (this.index < this.tokens.length) {
      const token = this.tokens[this.index];

      if (token === ")") {
        return;
      }

      if (token === "(") {
        this.index += 1;

        const anchor = lastNode || parentNode || this.root;
        this.parseSequence({
          parentNode: anchor,
          inVariation: true
        });

        if (this.tokens[this.index] === ")") {
          this.index += 1;
        }

        continue;
      }

      if (this.isMoveNumberToken(token)) {
        this.index += 1;
        continue;
      }

      if (this.isResultToken(token)) {
        this.resultToken = token;
        this.index += 1;
        return;
      }

      if (this.isCommentToken(token)) {
        if (lastNode) {
          const commentText = this.stripCommentDelimiters(token);
          this.appendComment(lastNode, commentText);
        }
        this.index += 1;
        continue;
      }

      if (this.isNagToken(token)) {
        if (lastNode) {
          this.appendNag(lastNode, token);
        }
        this.index += 1;
        continue;
      }

      // SAN / move token
      const moveInfo = this.normalizeMoveToken(token);

      const node = {
        id: this.generateId("move"),
        type: "move",
        parent: null,
        move: moveInfo.san,
        san: moveInfo.san,
        raw: token,
        moveNumber: this.detectMoveNumberFromContext(parentNode, lastNode),
        color: this.detectColorFromContext(parentNode, lastNode),
        comment: "",
        comments: [],
        nags: moveInfo.nags.slice(),
        variations: [],
        children: [],
        next: null,
        fenBefore: "",
        fenAfter: "",
        ply: this.getNextPly(parentNode, lastNode)
      };

      const relation = !lastNode && inVariation ? "variation" : "mainline";
      this.attachNode(parentNode || this.root, node, relation);

      lastNode = node;
      this.index += 1;
    }
  }

  attachNode(parent, node, relation) {
    if (!parent || !node) return;

    node.parent = parent.id;

    // Keep a unified list of direct children.
    if (!Array.isArray(parent.children)) {
      parent.children = [];
    }

    if (relation === "variation") {
      if (!Array.isArray(parent.variations)) {
        parent.variations = [];
      }

      parent.variations.push(node);
      parent.children.push(node);
    } else {
      parent.next = node;

      // Put mainline first in children.
      const existingIndex = parent.children.findIndex((child) => child && child.id === node.id);
      if (existingIndex === -1) {
        parent.children.unshift(node);
      }
    }
  }

  appendComment(node, commentText) {
    const text = (commentText || "").trim();
    if (!text) return;

    if (!Array.isArray(node.comments)) {
      node.comments = [];
    }

    node.comments.push(text);

    if (node.comment) {
      node.comment += ` ${text}`;
    } else {
      node.comment = text;
    }
  }

  appendNag(node, token) {
    if (!Array.isArray(node.nags)) {
      node.nags = [];
    }

    const normalized = token.trim();
    if (!normalized) return;

    node.nags.push(normalized);
  }

  stripCommentDelimiters(token) {
    if (!token) return "";

    const trimmed = token.trim();

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed.slice(1, -1).trim();
    }

    if (trimmed.startsWith(";")) {
      return trimmed.slice(1).trim();
    }

    return trimmed;
  }

  isCommentToken(token) {
    return typeof token === "string" && (token.startsWith("{") || token.startsWith(";"));
  }

  isNagToken(token) {
    return (
      typeof token === "string" &&
      (/^\$\d+$/.test(token) ||
        token === "!" ||
        token === "?" ||
        token === "!!" ||
        token === "??" ||
        token === "!?" ||
        token === "?!")
    );
  }

  isMoveNumberToken(token) {
    return typeof token === "string" && /^\d+\.(?:\.\.)?$/.test(token);
  }

  isResultToken(token) {
    return token === "1-0" || token === "0-1" || token === "1/2-1/2" || token === "*";
  }

  normalizeMoveToken(token) {
    let san = token;
    const nags = [];

    // Split trailing annotation glyphs from SAN, e.g. "Nf3!", "Qh5?!"
    const match = token.match(/^(.*?)([!?]{1,2})$/);
    if (match && match[1]) {
      san = match[1];
      nags.push(match[2]);
    }

    return { san, nags };
  }

  detectMoveNumberFromContext(parentNode, lastNode) {
    if (lastNode && typeof lastNode.moveNumber === "number") {
      return lastNode.moveNumber;
    }

    if (parentNode && typeof parentNode.moveNumber === "number") {
      return parentNode.moveNumber;
    }

    return null;
  }

  detectColorFromContext(parentNode, lastNode) {
    if (lastNode && lastNode.color) {
      return lastNode.color === "w" ? "b" : "w";
    }

    if (parentNode && parentNode.type === "move" && parentNode.color) {
      return parentNode.color === "w" ? "b" : "w";
    }

    return null;
  }

  getNextPly(parentNode, lastNode) {
    if (lastNode && typeof lastNode.ply === "number") {
      return lastNode.ply + 1;
    }

    if (parentNode && typeof parentNode.ply === "number") {
      return parentNode.ply + 1;
    }

    return 1;
  }
}

window.PGNParser = PGNParser;
