const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const execa = require('execa');

let url;

function getEcrImage(deploy_file) {
  const deploy = require(path.resolve(deploy_file));
  return deploy.taskDefinition &&
    deploy.taskDefinition.containerDefinitions &&
    deploy.taskDefinition.containerDefinitions[0].image || `${url}/${deploy.service.serviceName}`;
}

async function tagDockerImage(current_tag, ecr_tag, ecr_tag_latest) {
  try {
    await execa('docker', ['tag', current_tag, ecr_tag]);
    await execa('docker', ['tag', current_tag, ecr_tag_latest]);
  } catch (e) {
    throw new Error('tagDockerImage failed');
  }
}

async function loginV2() {
  return new Promise((resolve, reject) => {
    const get_password = execa('aws', ['ecr', 'get-login-password']);
    const docker_login = execa('docker', ['login', '-u', 'AWS', '--password-stdin', url]);
    get_password.stdout.on('error', reject);
    docker_login.stdout.on('error', reject);
    docker_login.stdout.on('close', resolve);
    get_password.stdout.pipe(docker_login.stdin);
  });
}

async function loginV1() {
  const get_login_command = await execa('aws', ['ecr', 'get-login', '--no-include-email']);
  await execa(get_login_command.stdout);
}

async function isV2() {
  const version_info = await execa('aws', ['--version']);
  return version_info.stdout.includes('aws-cli/2.');
}

async function loginToECR() {
  try {
    if (await isV2()) {
      await loginV2();
    } else {
      await loginV1();
    }
  } catch (error) {
    console.error(error);
    throw new Error('loginToECR failed');
  }
}

async function pushDockerImage(ecr_tag, ecr_tag_latest) {
  try {
    await execa('docker', ['push', ecr_tag]);
    await execa('docker', ['push', ecr_tag_latest]);
  } catch (error) {
    console.error(error);
    throw new Error('pushDockerImage failed');
  }
}

async function setUrlAndRegion() {
  const region = process.env.AWS_REGION;
  const caller_id = await execa('aws', ['sts', 'get-caller-identity']);
  const account_id = JSON.parse(caller_id.stdout).Account || '403799762630';
  
  url = `${account_id}.dkr.ecr.${region}.amazonaws.com`;
  process.env.AWS_DEFAULT_REGION = region;
}

async function run() {
  try {
    const repository_name = process.env.REPOSITORY_NAME;
    if (!repository_name) {
      throw new Error('Required environment variable REPOSITORY_NAME is not set.');
    }

    await setUrlAndRegion();

    const deploy_file = core.getInput('deploy-file');
    const build_number = core.getInput('build-number');

    const current_tag = `${repository_name}:${build_number}`;
    const version = `v${build_number}`;
    fs.writeFileSync('./VERSION.txt', version);

    const ecr_image = getEcrImage(deploy_file);
    const ecr_tag = `${ecr_image}:${version}`;
    const ecr_tag_latest = `${ecr_image}:latest`;

    await tagDockerImage(current_tag, ecr_tag, ecr_tag_latest);

    await loginToECR();

    await pushDockerImage(ecr_tag, ecr_tag_latest);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
