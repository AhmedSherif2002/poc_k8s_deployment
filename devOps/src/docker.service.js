import  path, { dirname } from "path";
import { fileURLToPath } from 'url';
import { deploy } from "./kubernetes.js";
import { execSync, exec } from "child_process";
import fs, { writeFileSync } from "fs"

export const cloneAndCreateDockerImage = async (language, projectName, buildCommand, startCommand , repoUrl, port)=>{
    let docker_base_image;
    let dependencies_file;
    if(language === "node"){
        docker_base_image="node:18";
        dependencies_file="package*.json";
    }
    else if(language === "python"){
        docker_base_image="python:3.9";
        dependencies_file="requirements.txt";
    }
    const startCommandArray = startCommand.split(" ").map(word => `"${word}"`).join(", ");
    const dockerfileContent =
    `
        FROM ${docker_base_image}
        WORKDIR /app
        COPY ${dependencies_file} ./ 
        RUN ${buildCommand}
        COPY . . 
        EXPOSE ${port}
        CMD [ ${startCommandArray} ]
    `;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const clonePath = path.join(__dirname, '../temp', projectName);
    const dockerfilePath = path.join(clonePath,"Dockerfile");
    try {
        execSync(`git clone ${repoUrl} ${clonePath}`, { stdio: "inherit" });
        console.log(`Repository cloned successfully to ${clonePath}`);
    } catch (error) {
        console.error(`Error cloning repo: ${error.message}`);
        process.exit(1); // Exit with error code
    }
    writeFileSync(dockerfilePath, dockerfileContent);
    const imageName = `dimg-${projectName}`;
    buildImage(imageName, clonePath);
    console.log("out")
    deploy(projectName, imageName, port);
    return;
}

const buildImage = async (imageName, clonePath)=>{
    const process = execSync(`docker build -t ${imageName} ${clonePath}`, { stdio: "inherit" });
    execSync(`docker tag ${imageName} myacr.azurecr.io/my-app:v1`)
    console.log("Image built")
    console.log(process);
    return;
}