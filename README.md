# Tag and push to ECR

Github action for tagging and pushing image to ECR.

## Inputs

### `deploy-file`

**Required** Path to deploy file in repo. Defaults to `./deploy.json`

### `repository-name`

**Required** Name of the repository.

### `build-number`

**Required** Build number.

## Environment variables

### `AWS_ACCESS_KEY_ID`

**Required**

### `AWS_SECRET_ACCESS_KEY`

**Required**

### `AWS_DEFAULT_REGION`

**Required**

## Example usage

```yml
- name: Tag and push to ECR
  uses: springworks/tag-and-push-to-ecr@master
  with:
    deploy-file: './deploy_files/deploy.json'
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_DEFAULT_REGION: 'eu-west-1'
```
