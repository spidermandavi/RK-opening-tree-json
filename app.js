const inputs = document.getElementById("inputs");
const output = document.getElementById("output");

function addInput(value = "") {

  const wrapper = document.createElement("div");
  wrapper.className = "inputWrapper";

  const input = document.createElement("input");
  input.className = "studyInput";
  input.placeholder = "https://lichess.org/study/...";
  input.value = value;

  wrapper.appendChild(input);

  inputs.appendChild(wrapper);

}

addInput();

document.getElementById("addBtn").onclick = () => {
  addInput();
};

document.getElementById("copyBtn").onclick = async () => {

  if (!output.value) return;

  try {

    await navigator.clipboard.writeText(output.value);

    alert("JSON copied.");

  } catch (err) {

    console.error(err);
    alert("Failed to copy.");

  }

};

document.getElementById("saveBtn").onclick = () => {

  if (!output.value) return;

  const blob = new Blob(
    [output.value],
    { type: "application/json" }
  );

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "rk-opening-tree.json";

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(a.href);

};

document.getElementById("convertBtn").onclick = async () => {

  const links = [...document.querySelectorAll(".studyInput")]
    .map(input => input.value.trim())
    .filter(Boolean);

  if (!links.length) {

    alert("Add at least one study link.");
    return;

  }

  const finalData = {
    version: "2.0",
    createdAt: new Date().toISOString(),
    studies: []
  };

  for (const link of links) {

    try {

      const studyId = extractStudyId(link);

      /*
        IMPORTANT:
        This endpoint works for public studies.
      */
      const url = `https://lichess.org/study/${studyId}.pgn`;

      const response = await fetch(url, {
        headers: {
          "Accept": "application/x-chess-pgn"
        }
      });

      if (!response.ok) {

        throw new Error(
          `Failed to fetch PGN (${response.status})`
        );

      }

      const pgn = await response.text();

      if (!pgn || pgn.includes("<!DOCTYPE html>")) {

        throw new Error(
          "Invalid PGN received. Make sure the study is public."
        );

      }

      /*
        FIXED:
        Correct parser global name.
      */
      const parsedGames = PGNParser.parse(pgn);

      const studyObject = {
        studyId,
        studyName:
          parsedGames?.[0]?.headers?.Event ||
          `study-${studyId}`,
        chapters: []
      };

      parsedGames.forEach((game, chapterIndex) => {

        const chapterName =
          game?.headers?.Event ||
          `chapter-${chapterIndex + 1}`;

        const mainlineId =
          sanitize(chapterName) +
          "__" +
          sanitize(studyId);

        const tree = buildTree(
          game.moves,
          mainlineId
        );

        studyObject.chapters.push({
          chapterId:
            `${mainlineId}__chapter_${chapterIndex + 1}`,

          chapterName,

          tree
        });

      });

      finalData.studies.push(studyObject);

    } catch (err) {

      console.error(err);

      alert(
        `Failed to process:\n${link}\n\n${err.message}`
      );

    }

  }

  output.value = JSON.stringify(
    finalData,
    null,
    2
  );

};

function buildTree(moves, mainlineId) {

  const root = {
    type: "root",
    branches: []
  };

  recurse(moves, root);

  return root;

  function recurse(moveList, parent) {

    if (!moveList || !moveList.length) {
      return;
    }

    let currentParent = parent;

    moveList.forEach((moveObj, index) => {

      const isBlack =
        moveObj.moveNumberIndication === "...";

      const ply =
        moveObj.turn * 2 - (isBlack ? 0 : 1);

      const node = {
        move: moveObj.move,
        san: moveObj.move,
        comment: "",
        nags: [],
        ply,
        side: isBlack ? "black" : "white",
        moveNumber: moveObj.turn,

        mainlineId,

        nodeId:
          `${mainlineId}__${moveObj.turn}_${index}_${Date.now()}`,

        branches: []
      };

      currentParent.branches.push(node);

      /*
        Variations
      */
      if (moveObj.ravs && moveObj.ravs.length) {

        moveObj.ravs.forEach(rav => {

          recurse(
            rav.moves,
            node
          );

        });

      }

      /*
        Continuation
      */
      if (moveObj.moves && moveObj.moves.length) {

        recurse(
          moveObj.moves,
          node
        );

      }

      currentParent = node;

    });

  }

}

function extractStudyId(url) {

  const match = url.match(
    /lichess\.org\/study\/([A-Za-z0-9]+)/
  );

  if (!match) {

    throw new Error(
      "Invalid Lichess study URL"
    );

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
