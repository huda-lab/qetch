'''
	Usage:

		python3 filter-sketches-from-mturk-results.py csv-with-filter-results-from-mturk.csv min

		min is the minimum amount of invalid votes to discarge the query

'''
import csv
import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.path as path
import matplotlib.ticker as mtick
import os

csvfile = open(sys.argv[1], newline='')
reader = csv.DictReader(csvfile, delimiter=',', quotechar='"')
minInvVotes = int(sys.argv[2])

questions = ['cwh', 'fp', 'hasb', 'ihas', 'rb', 'sd', 'sp', 'sr']
questionsNum = 150
invalidQuestions = {}

for row in reader:
	for key, value in row.items():
		if value == 'on':
			sketch = key.split('.')[1]
			if int(sketch.split('-')[2]) > questionsNum: continue
			invQstNum = invalidQuestions.get(sketch, 0)
			invalidQuestions[sketch] = invQstNum + 1

for key, value in invalidQuestions.items():
	if (value >= minInvVotes):
		os.rename('pngs/' + key + '.png', 'rejected/' + key + '.png')

def filterSketch(file):
	for line in file:
		sketchName = line.split('\t')[0]
		if not (sketchName in invalidQuestions) or invalidQuestions[sketchName] < minInvVotes:
			yield line

for question in questions:
	source = open('qst-' + question + '-raw.csv','r')
	destination = open('qst-' + question + '.csv','w')
	destination.writelines(filterSketch(source))
