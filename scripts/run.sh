#!/bin/sh

export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh
echo "Making sure in correct directory.."
cd ~/ufc-api-reader
yarn
echo "Scraping Data.."
yarn start


