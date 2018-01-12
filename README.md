# Qetch

Qetch is a tool that allows users to freely sketch patterns on a scale-less canvas to query time series data without specifying query length or amplitude. 

We study how humans sketch time series patterns --- humans preserve visually salient perceptual features but often non-uniformly scale and locally distort a pattern --- and we develop a novel matching algorithm that accounts for human sketching errors. 

Qetch enables the easy construction of complex and expressive queries with two key features: *regular expressions over sketches* and *relative positioning of sketches* to query multiple time-aligned series. 


# Useful links

- [Pre-print version of the paper](https://github.com/dtl-nyuad/qetch/blob/resources/CHI_18_QETCH_preprint.pdf)

- Demo video [not available yet]

- [Extensive demo video](https://youtu.be/Owb-SuW2cIE)


# Repository content

This repository contains:

- Qetch's source code, contained in the folder `Server`

- The datasets we used to compute our user studies, and Qetch's performance evaluations are contained in the folder `Datasets`

- The collected queries from our crowd study are in the folder `Crowd-Study Data`

# Run Qetch

The project's backend has been developed using NodeJS and a front-end which includes many technologies, such as: AngularJS, D3, Bootstrap, Paper.js, Math.js, etc. It requires a PostreSQL database in order to store and load time series.

In order to run the project install the required dependencies with the following commands:

    bower install
    npm install

To run the server run the following command:

    npm start

Now the interface can be accessed from a browser at:

    http://localhost:2048/

## Configure Database

The database connection settings can be found in the file: `Server/config.json`

In order to load the data to the database the scripts in the folder `Datasets` should be used. The script `Datasets/utils/load_all.sh` loads all the available datasets.
