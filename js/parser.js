class PGNParser {
      while (index < tokens.length) {

        let token = tokens[index];

        if (token === ")") {
          break;
        }

        if (token === "(") {

          index++;

          const variationNode = parseSequence();

          if (currentNode) {
            currentNode.variations.push(variationNode);
          }

          index++;
          continue;
        }

        if (/^\d+\./.test(token)) {
          index++;
          continue;
        }

        if (token.startsWith("{")) {

          if (currentNode) {
            currentNode.comment = token
              .replace(/^\{/, "")
              .replace(/\}$/, "")
              .trim();
          }

          index++;
          continue;
        }

        if (["1-0", "0-1", "1/2-1/2", "*"].includes(token)) {
          break;
        }

        const newNode = {
          id: this.generateId("move"),
          move: token,
          san: token,
          comment: "",
          nags: [],
          variations: [],
          next: null,
          parent: currentNode ? currentNode.id : null
        };

        if (!firstNode) {
          firstNode = newNode;
        }

        if (currentNode) {
          currentNode.next = newNode;
        }

        currentNode = newNode;

        index++;
      }

      return firstNode;
    };

    return parseSequence();
  }
}
