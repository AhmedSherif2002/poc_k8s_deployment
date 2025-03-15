import { readFileSync, writeFileSync } from "fs";
import { exec, execSync, spawn } from "child_process";
import { join } from "path";
import { KubeConfig, AppsV1Api, CoreV1Api } from "@kubernetes/client-node";
// import k8s from "@kubernetes/client-node"

const clusterName = `3nodes-cluster`;


const kc = new KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(AppsV1Api);
const k8sCoreApi = kc.makeApiClient(CoreV1Api);
console.log(kc.currentContext)
// k8sApi.namespace = "default";
// console.log(kc.getContextObject(kc.currentContext)?.namespace)
// console.log(await k8sApi.listNamespacedDeployment({ namespace: 'default' }));

const configPorts = () => {
    const  data = readFileSync('/root/pocs/kubernetes/devOps/src/ports.json', 'utf-8');
    const ports = JSON.parse(data);
    let newPorts = ports
    newPorts.service = parseInt(ports.service)+1;
    newPorts.node = parseInt(ports.node)+1;
    writeFileSync('/root/pocs/kubernetes/devOps/src/ports.json', JSON.stringify(newPorts));
    return ports;
}

export const deploy = async (appName, imageName, port) => {
    const ports = configPorts();
    console.log("ports done")
    pushImageToCluster(imageName);
    createDeploymentManifest(appName, ports, imageName, port);
}

const pushImageToCluster = async (imageName) => {
    try{
        const output = execSync(`kind load docker-image ${imageName} --name ${clusterName}`);
        console.log("Docker image loaded to the cluster", output);
    }catch(error){
        console.log("Error ", error)
    }
}

const createDeploymentManifest = async (appName, ports, imageName, appPort) => {
    const servicePort = ports.service;
    const nodePort = ports.node;
    try{
        // const deploymentManifestLocation = join(__dirname, `/../temp/deployment-${appName}.yaml`);
        const deployment = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: { name: `${appName}` },
            spec: {
                replicas: 2,
                selector: { matchLabels: { app: `${appName}` } },
                template: {
                metadata: { labels: { app: `${appName}` } },
                spec: {
                    containers: [
                    {
                        name: `${appName}`,
                        image: `${imageName}`, // Local image loaded into Kind
                        ports: [{ containerPort: appPort }],
			imagePullPolicy: "Always"
                    },
                    ],
		imagePullSecrets: [{ name: "acr-secret" }]
                },
                },
            },
            };

          const service = {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: { name: `${appName}-service` },
            spec: {
              selector: { app: `${appName}` },
              ports: [{ protocol: 'TCP', port: servicePort, targetPort: appPort, nodePort: nodePort }],
              type: 'LoadBalancer',
            },
          };
          await k8sApi.createNamespacedDeployment({ namespace: 'default' , body: deployment});
          await k8sCoreApi.createNamespacedService({ namespace: 'default' , body: service});
          console.log("deployment completed");
          return;
    }catch(err){
        console.log("Error writing manifest", err);
    }
}


// createDeploymentManifest("aa", 22, "44");

createDeploymentManifest("registry-test", {service: 4004, node: 30084}, 'fadyimageregistery.azurecr.io/my_nginx:latest', 80);
