const core = require('@actions/core');
const { writeFileSync } = require('fs');
const exec = require('@actions/exec');
const execa = require('execa');
const { resolve } = require('path');

function getEcrImage(deploy_file) {
  const deploy = require(resolve(deploy_file));
  return deploy.taskDefinition
      && deploy.taskDefinition.containerDefinitions
      && deploy.taskDefinition.containerDefinitions[0].image || '403799762630.dkr.ecr.eu-west-1.amazonaws.com/' + deploy.service.serviceName;
}

async function tagDockerImage(current_tag, ecr_tag, ecr_tag_latest) {
  try {
    await exec.exec('docker', ['tag', current_tag, ecr_tag]);
    await exec.exec('docker', ['tag', current_tag, ecr_tag_latest]);
  }
  catch (e) {
    throw new Error('tagDockerImage failed');
  }
}

async function loginToECR() {
  try {
    const { stdout: ecr_login_command } = await execa('aws', ['ecr', 'get-login', '--no-include-email']);
    await exec.exec(ecr_login_command);
  }
  catch (e) {
    throw new Error('loginToECR failed');
  }
}

async function pushDockerImage(ecr_tag, ecr_tag_latest) {
  try {
    await exec.exec('docker', ['push', ecr_tag]);
    await exec.exec('docker', ['push', ecr_tag_latest]);
  }
  catch (e) {
    throw new Error('pushDockerImage failed');
  }
}

async function run() {
  try {
    const deploy_file = core.getInput('deploy-file');
    const repository_name = core.getInput('repository-name');
    const build_number = core.getInput('build-number');

    const current_tag = `${repository_name}:${build_number}`;
    const version = `v${build_number}`;
    writeFileSync('./VERSION.txt', version);

    const ecr_image = getEcrImage(deploy_file);
    const ecr_tag = `${ecr_image}:${version}`;
    const ecr_tag_latest = `${ecr_image}:latest`;

    await tagDockerImage(current_tag, ecr_tag, ecr_tag_latest);

    await loginToECR();

    await pushDockerImage(ecr_tag, ecr_tag_latest);
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();
