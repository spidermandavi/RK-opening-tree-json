
const addStudyBtn = document.getElementById("addStudyBtn");
const convertBtn = document.getElementById("convertBtn");
const copyBtn = document.getElementById("copyBtn");
const saveBtn = document.getElementById("saveBtn");
const output = document.getElementById("output");
const studyInputs = document.getElementById("studyInputs");

addStudyBtn.addEventListener("click", () => {
  const row = document.createElement("div");
  row.className = "study-row";

  row.innerHTML = `
    <input
      type="text"
      class="study-link"
      placeholder="Paste Lichess study URL..."
    />
  `;

  studyInputs.appendChild(row);
});

copyBtn.addEventListener("click", async () => {
  if (!output.value.trim()) {
    alert("No JSON generated yet.");
    return;
  }

  await navigator.clipboard.writeText(output.value);
  alert("JSON copied to clipboard.");
});

saveBtn.addEventListener("click", () => {
  if (!output.value.trim()) {
    alert("No JSON generated yet.");
    return;
  }

  const blob = new Blob([output.value], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "racing-kings-opening-tree.json";
  a.click();

  URL.revokeObjectURL(url);
});

convertBtn.addEventListener("click", async () => {
  const links = [...document.querySelectorAll(".study-link")]
    .map(input => input.value.trim())
    .filter(Boolean);

  if (!links.length) {
    alert("Please add at least one study link.");
    return;
  }

  try {
    convertBtn.disabled = true;
    convertBtn.textContent = "Converting...";

    const studies = [];

    for (const link of links) {
      const studyData = await processStudy(link);
      studies.push(studyData);
    }

    const finalJson = {
      formatVersion: "1.0",
      generatedAt: new Date().toISOString(),
      studies
    };

    output.value = JSON.stringify(finalJson, null, 2);
  } catch (error) {
    console.error(error);
    alert("Failed to process one or more studies. Check console.");
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert Studies";
  }
});

async function processStudy(link) {
  const cleanLink = link.replace(/\/$/, "");

  const studyIdMatch = cleanLink.match(/study\/([a-zA-Z0-9]+)/);

  if (!studyIdMatch) {
    throw new Error("Invalid Lichess study URL: " + link);
  }

  const studyId = studyIdMatch[1];

  const pgnUrl = `https://lichess.org/study/${studyId}.pgn`;

  const response = await fetch(pgnUrl);

  if (!response.ok) {
    throw new Error("Could not fetch PGN for study: " + studyId);
  }

  const pgnText = await response.text();

  return convertPgnToTree(pgnText, studyId);
}

function convertPgnToTree(pgnText, studyId) {
  const games = splitPgnGames(pgnText);

  const studyObject = {
    studyId,
    studyName: extractStudyName(games[0]) || studyId,
    chapters: []
  };

  games.forEach((gameText, chapterIndex) => {
    const headers = parseHeaders(gameText);

    const chapterName =
      headers.Event ||
      headers.Site ||
      `Chapter-${chapterIndex + 1}`;

    const movesSection = removeHeaders(gameText);

    const moveTokens = tokenizeMoves(movesSection);

    const tree = buildTree(moveTokens, chapterName, studyId);

    studyObject.chapters.push({
      chapterId: `${studyId}-chapter-${chapterIndex + 1}`,
      chapterName,
      tree
    });
  });

  return studyObject;
}

function splitPgnGames(text) {
  return text
    .split(/\n\s*\n(?=\[Event)/g)
    .map(game => game.trim())
    .filter(Boolean);
}

function parseHeaders(gameText) {
  const headers = {};
  const lines = gameText.split("\n");

  for (const line of lines) {
    const match = line.match(/^\[(\w+)\s+"(.*)"\]$/);

    if (match) {
      headers[match[1]] = match[2];
    }
  }

  return headers;
}

function removeHeaders(gameText) {
  return gameText.replace(/(\[(.|\n)*?\]\s*)+/g, "").trim();
}

function extractStudyName(gameText) {
  const headers = parseHeaders(gameText);
  return headers.Event || headers.Site || null;
}

function tokenizeMoves(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\$\d+/g, "")
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
    .split(/\s+/)
    .filter(token => {
      return (
        token &&
        !/^\d+\.+$/.test(token) &&
        !/^\d+\.{3}$/.test(token)
      );
    });
}

function buildTree(tokens, chapterName, studyId) {
  const root = {
    nodeType: "root",
    branches: []
  };

  let current = root;

  const mainlineId =
    sanitizeId(chapterName) +
    "--" +
    sanitizeId(studyId);

  tokens.forEach((move, index) => {
    const node = {
      move,
      ply: index + 1,
      moveNumber: Math.ceil((index + 1) / 2),
      side: index % 2 === 0 ? "white" : "black",
      mainlineId,
      nodeId: `${mainlineId}--ply-${index + 1}`,
      comment: "",
      branches: []
    };

    current.branches.push(node);
    current = node;
  });

  return root;
}

function sanitizeId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
