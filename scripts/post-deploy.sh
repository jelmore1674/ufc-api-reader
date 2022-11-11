#!/bin/sh
export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh
echo "Making sure in correct directory.."
cd ~/ufc-api-reader
echo "Installing packages..."
yarn
echo "Pull Database..."
yarn prisma:pull
echo "Generate Prisma Client..."
yarn prisma:generate