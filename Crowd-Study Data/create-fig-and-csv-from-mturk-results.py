'''
	Usage:

		python3 create-fig-and-csv-from-mturk-results.py csv-with-results-from-mturk.csv 1 5

		where 1 is the number to start the questions
		where 5 is the number end the question


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
workersId = set()

rownum = 0

def analyze(row, qst, rownum):
	xPoints = []
	yPoints = []
	
	queryPts = row['Answer.' + qst + '-drawpts']
	for v in queryPts[1:-1].split(')('):
		questionPts = v.split(',')
		if len(questionPts[0]) > 0 and len(questionPts[1]) > 0:
			xPoints.append(int(questionPts[0]))
			yPoints.append(int(questionPts[1]))

	if len(yPoints) > 0:
		maxval = max(yPoints)
		yPoints = list(map(lambda v: maxval - v, yPoints))

		plt.plot(xPoints, yPoints)
		plt.axis('off')
		plt.savefig('pngs/qst-%s-%03d' % (qst, rownum))
		print('Saved fig: ' + 'pngs/qst-%s-%03d' % (qst, rownum))
		plt.clf()

		questionres[qst].write('qst-%s-%03d\t000\t000\t000\t000\t000\t%s\n' % (qst, rownum, queryPts))


questions = []
questionres = {}

for i in range(2, len(sys.argv)):
	qst = sys.argv[i]
	questions.append(qst)
	questionres[qst] = open('qst-%s-raw.csv' % qst, 'w')
	print('Opened ' + questionres[qst].name + '...')
	questionres[qst].write('question\tquestionpos\tquestionmetric\ttotalresults\tcalctime\tpositions\tquestionpoints\n')

for row in reader:
	rownum += 1

	workerid = row['WorkerId']
	if workerid in workersId:
		print('DUPLICATE IN ROWS for ' + workerid)
	workersId.add(workerid)

	for qst in questions:
		analyze(row, qst, rownum)

for q in questionres.values():
	q.close()
