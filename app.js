const inputs = document.getElementById("inputs");

  function recurse(moveList, parent) {

    if (!moveList || !moveList.length) return;

    let currentParent = parent;

    moveList.forEach((moveObj, index) => {

      const moveText =
        moveObj.notation?.notation ||
        moveObj.notation ||
        moveObj.move ||
        "";

      const turn = moveObj.turn || moveObj.moveNumber || 1;

      const isBlack = moveObj.moveNumberIndication === "...";

      const node = {
        move: moveText,
        san: moveText,
        comment: moveObj.comment || "",
        nags: moveObj.nags || [],
        ply: turn * 2 - (isBlack ? 0 : 1),
        side: isBlack ? "black" : "white",
        moveNumber: turn,
        mainlineId,
        nodeId: `${mainlineId}__${turn}_${index}_${Math.random().toString(36).slice(2, 8)}`,
        branches: []
      };

      currentParent.branches.push(node);

      if (moveObj.variations && moveObj.variations.length) {

        moveObj.variations.forEach(variation => {
          recurse(variation, node);
        });

      }

      currentParent = node;

    });

  }

}

function extractStudyId(url) {

  const match = url.match(/lichess\.org\/study\/([A-Za-z0-9]+)/);

  if (!match) {
    throw new Error("Invalid study URL");
  }

  return match[1];

}

function sanitize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
