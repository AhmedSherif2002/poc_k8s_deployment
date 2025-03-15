import express from "express";
import bodyParser from "body-parser";
import { execSync } from 'child_process';
import fs from "fs";
import path from "path"; 
import { cloneAndCreateDockerImage } from "../../devOps/src/docker.service.js";

const app = express();
const PORT = 4000;

app.use(bodyParser.json());

app.post("/generate-dockerfile", (req, res) => {
  const { projectName, language, buildCommand, startCommand , repoUrl, port} = req.body;

  if (!projectName || !language || !buildCommand || !startCommand || !repoUrl) {
    return res.status(400).send("Missing required parameters");
  }
  
  if(language !== "node" && language !== "python"){
    return res.status(400).send("Not supported language");
  }
  try{
    cloneAndCreateDockerImage(language, projectName, buildCommand, startCommand , repoUrl, port);
    res.status(200);
  }catch(err){
    res.status(400);
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
