# Links

 - MIT-BIH Series: http://ecg.mit.edu/time-series/index.html


 - For the arrythmia has been used the database QT Database: qtdb/sel102

		rdsamp -r qtdb/sel102 -c -H -f 210 -t 220 -v -Ps | sed -n 'p;n' | sed -n 'p;n' > QTDB-SEL102.csv

	or using 

		https://www.physionet.org/cgi-bin/atm/ATM

	remember to remove the second line

 - For the ISP database

 		https://datamarket.com/data/set/232j/internet-traffic-data-in-bits-from-a-private-isp-with-centres-in-11-european-cities-the-data-corresponds-to-a-transatlantic-link-and-was-collected-from-0657-hours-on-7-june-to-1117-hours-on-31-july-2005-hourly-data#!

- Number of unemployed

	Icelandic Directorate of Labour

	https://datamarket.com/data/set/ybz/number-of-unemployed#!ds=ybz!2m5e=1&display=line

- Balance sheet of insurance companies - Equity
	Source: Central Bank of Iceland

	https://datamarket.com/data/set/wqp/insurance-companies#!ds=wqp!4mq=3:4mr=3:4ms=b&display=line
