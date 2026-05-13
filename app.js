
const inputs = document.getElementById("inputs");
const output = document.getElementById("output");

function addInput(value = ""){
  const input = document.createElement("input");
  input.className = "studyInput";
  input.placeholder = "https://lichess.org/study/...";
  input.value = value;
  inputs.appendChild(input);
}

addInput();

document.getElementById("addBtn").onclick = () => addInput();

document.getElementById("copyBtn").onclick = async () => {
  if(!output.value) return;
  await navigator.clipboard.writeText(output.value);
  alert("Copied.");
};

document.getElementById("saveBtn").onclick = () => {
  if(!output.value) return;

  const blob = new Blob([output.value], {
    type:"application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "rk-opening-tree.json";
  a.click();
};

document.getElementById("convertBtn").onclick = async () => {

  const links = [...document.querySelectorAll(".studyInput")]
    .map(i => i.value.trim())
    .filter(Boolean);

  if(!links.length){
    alert("Add at least one study link.");
    return;
  }

  const finalData = {
    version:"2.0",
    createdAt:new Date().toISOString(),
    studies:[]
  };

  for(const link of links){

    try{

      const studyId = extractStudyId(link);

      const url = `https://lichess.org/api/study/${studyId}.pgn`;

      const res = await fetch(url);

      if(!res.ok){
        throw new Error("Could not fetch PGN");
      }

      const pgn = await res.text();

      const parsedGames = pgnParser.parse(pgn);

      const studyObject = {
        studyId,
        studyName: parsedGames?.[0]?.headers?.Event || studyId,
        chapters:[]
      };

      parsedGames.forEach((game, chapterIndex) => {

        const chapterName =
          game?.headers?.Event ||
          `chapter-${chapterIndex + 1}`;

        const mainlineId =
          sanitize(chapterName) +
          "__" +
          sanitize(studyId);

        const tree = buildTree(game.moves, mainlineId);

        studyObject.chapters.push({
          chapterId:`${mainlineId}__chapter_${chapterIndex+1}`,
          chapterName,
          tree
        });

      });

      finalData.studies.push(studyObject);

    }catch(err){
      console.error(err);
      alert("Failed to process: " + link);
    }

  }

  output.value = JSON.stringify(finalData, null, 2);

};

function buildTree(moves, mainlineId){

  const root = {
    type:"root",
    branches:[]
  };

  function recurse(moveList, parent){

    if(!moveList) return;

    moveList.forEach((moveObj, index) => {

      const node = {
        move:moveObj.move,
        san:moveObj.move,
        comment:"",
        nags:[],
        ply:moveObj.turn * 2 - (moveObj.moveNumberIndication === "..." ? 0 : 1),
        side:moveObj.moveNumberIndication === "..." ? "black" : "white",
        moveNumber:moveObj.turn,
        mainlineId,
        nodeId:`${mainlineId}__${moveObj.turn}_${index}`,
        branches:[]
      };

      parent.branches.push(node);

      if(moveObj.ravs && moveObj.ravs.length){

        moveObj.ravs.forEach(rav => {
          recurse(rav.moves, node);
        });

      }

      if(moveObj.moves && moveObj.moves.length){
        recurse(moveObj.moves, node);
      }

      parent = node;

    });

  }

  recurse(moves, root);

  return root;

}

function extractStudyId(url){

  const match = url.match(/study\/([A-Za-z0-9]+)/);

  if(!match){
    throw new Error("Invalid study URL");
  }

  return match[1];

}

function sanitize(text){
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
