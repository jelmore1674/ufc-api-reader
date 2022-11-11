#!/bin/sh
export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh
echo "Making sure in correct directory.."
cd ~/ufc-api-reader
echo "Installing packages..."
yarn
echo "Pull Database and generate prisma..."
yarn db:pull
