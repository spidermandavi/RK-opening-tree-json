const parser = new PGNParser();
const convertBtn = document.getElementById("convertBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");

let latestJSON = null;

const samplePGN = `[Event "RK opening tree test 1: Knight openings"]
[Date "2026.05.13"]
[Result "*"]
[Variant "Racing Kings"]
[ECO "?"]
[Opening "?"]
[StudyName "RK opening tree test 1"]
[ChapterName "Knight openings"]
[FEN "8/8/8/8/8/8/krbnNBRK/qrbnNBRQ w - - 0 1"]

1. Nxc2 Nxf2 (1... Kb3 2. Nc3 Nxc3) 2. Rxf2 *`;

pgnInput.value = samplePGN;

convertBtn.addEventListener("click", () => {

  try {

    const pgn = pgnInput.value.trim();

    if (!pgn) {
      alert("Please paste a PGN first.");
      return;
    }

    latestJSON = parser.parse(pgn);

    jsonOutput.textContent = JSON.stringify(latestJSON, null, 2);

    statusText.textContent = "Conversion successful";

  } catch (error) {

    console.error(error);

    statusText.textContent = "Conversion failed";

    jsonOutput.textContent = error.message;
  }
});

downloadBtn.addEventListener("click", () => {

  if (!latestJSON) {
    alert("Convert a PGN first.");
    return;
  }

  JSONExporter.download(latestJSON);
});

clearBtn.addEventListener("click", () => {

  pgnInput.value = "";

  jsonOutput.textContent = "";

  latestJSON = null;

  statusText.textContent = "Waiting...";
});
