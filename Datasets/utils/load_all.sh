node db_load.js measurments TEST t1 0 1 true false ../Test1.csv
node db_load.js measurments TEST t2 0 1 true false ../Test2.csv
node db_load.js measurments TEST t3 0 1 true false ../Test3.csv

node db_load.js measurments MITBIH s1 0 1 true false ../MIT-BIH-series1.csv
node db_load.js measurments MITBIH s2 0 1 true false ../MIT-BIH-series2.csv
node db_load.js measurments MITBIH s3 0 1 true false ../MIT-BIH-series3.csv
node db_load.js measurments MITBIH s4 0 1 true false ../MIT-BIH-series4.csv
node db_load.js measurments MITBIH STC302 0 1 true false ../MITBIH-ST-CHANGE-302.csv
node db_load.js measurments MITBIH STC301 0 1 true false ../MITBIH-ST-CHANGE-301.csv

node db_load.js measurments PRICES APPL 0 6 false false ../APPL\ Prices.csv
node db_load.js measurments PRICES MSFT 0 6 false false ../MSFT\ Prices.csv
node db_load.js measurments PRICES AMZN 0 6 false false ../AMZN\ Prices.csv
node db_load.js measurments PRICES INTL 0 6 false false ../INTL\ Prices.csv
node db_load.js measurments PRICES UTX 0 6 false false ../UTX\ Prices.csv
node db_load.js measurments PRICES APC 0 6 false false ../APC\ Prices.csv
node db_load.js measurments PRICES ALK 0 6 false false ../ALK\ Prices.csv

node db_load.js measurments QTDB SEL102 0 1 true false ../QTDB-SEL102.csv

node db_load.js measurmentsISP s1 0 1 false true ../ISP-series1.csv

node db_load.js measurments CMP1 unemployed 0 1 false true ../CMP1\ -\ unemployed.csv
node db_load.js measurments CMP1 insuranceeq 0 1 false true ../CMP1\ -\ insuranceeq.csv

node db_load.js measurments USRTST forexchangebrius 0 1 false false ../daily-foreign-exchange-rates-british-US.csv
node db_load.js measurments USRTST saugeenrivtemp 0 1 false false ../mean-daily-temperature-saugeen-river.csv
node db_load.js measurments USRTST precipitationseastport 0 1 false false ../precipitation-in-mm-eastport-usa.csv
node db_load.js measurments USRTST importprodminingcoal 0 1 false false ../Imported-products-used-in-the-mining-of-coal.csv

node db_load.js descriptions descriptions.csv
node db_load.js seriesDescriptions seriesdescriptions.csv