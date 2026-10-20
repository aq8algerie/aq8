import React from 'react';
import { strict as assert } from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { MeasurementDetails } from '../src/components/manager/cards/MeasurementDetails';
import { MeasurementHistory } from '../src/components/manager/cards/MeasurementHistory';
import { ManagerMeasurementsView } from '../src/components/manager/ManagerMeasurementsView';
import type { Client, Measurement } from '../src/types';

const measurement: Measurement = {
  id:'measurement-a',clientId:'client-a',centerId:'center-a',date:'2023-08-28',weight:103.2,
  waist:94,heightCm:160,leftArm:37,lowerAbdomen:114,navel:112,thighHigh:72,thighMid:65,targetWeight:90,loggedBy:'legacy-import',
};
const details=renderToStaticMarkup(<MeasurementDetails measurement={measurement} />);
for(const label of ['Taille corporelle','Tour de taille','Bras gauche','Bas abdomen','Nombril','Cuisses H','Cuisses M','Objectif de poids']) assert(details.includes(label),label);
for(const value of ['160 cm','94 cm','90 kg','72 cm','65 cm']) assert(details.includes(value),value);
const invalid: Measurement={...measurement,heightCm:undefined,targetWeight:undefined,historicalMeasurements:{height:'1068.00',waist:'94.00',leftArm:'37.00',lowerAbdomen:'114.00',navel:'112.00',thighHigh:'72.00',thighMid:'65.00',targetWeight:'1.65',measuredAt:'2023-08-28T20:49:51',sourceSha256:'source',sourcePage:3}};
const anomaly=renderToStaticMarkup(<MeasurementDetails measurement={invalid} />);
assert(anomaly.includes('à vérifier'));assert(anomaly.includes('1068.00'));assert(!anomaly.includes('1068 cm'));assert(!anomaly.includes('1,65 kg'));
const history=renderToStaticMarkup(<MeasurementHistory measurements={[measurement,{...measurement,id:'measurement-b',weight:104}]} />);
assert.equal((history.match(/<details /g)||[]).length,2,'Same-day source records must remain separate.');
const manager=renderToStaticMarkup(<ManagerMeasurementsView centerId="center-a" clients={[{id:'client-a',centerId:'center-a',firstName:'Client',lastName:'Test'} as Client]} measurements={[measurement,{...measurement,id:'foreign',centerId:'center-b',weight:999}]} onLogMeasurementClick={()=>{}} />);
assert(!manager.includes('999'),'A measurement from another center must not be rendered.');
console.log('Measurement display: complete fields, distinct height/waist, flagged anomalies, separate records and center isolation OK.');
