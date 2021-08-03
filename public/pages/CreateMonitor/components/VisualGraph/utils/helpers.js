/*
 *   Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import _ from 'lodash';

import { selectOptionValueToText } from '../../MonitorExpressions/expressions/utils/helpers';
import {
  AGGREGATION_TYPES,
  UNITS_OF_TIME,
} from '../../MonitorExpressions/expressions/utils/constants';
import { Y_DOMAIN_BUFFER, DEFAULT_MARK_SIZE } from './constants';
import { MONITOR_TYPE } from '../../../../../utils/constants';

//TODO: Modify this function to get the graph title using index
export function getYTitle(values) {
  return _.get(values, 'fieldName[0].label', 'count');
}

export function getLeftPadding(yDomain) {
  const [min, max] = yDomain;
  const maxLength = Math.max(min.toString().length, max.toString().length);
  // These are MAGIC numbers..
  // 80 is the default left padding
  // 9 is the length when we start adding to base
  // 10 is the number we multiply to add left padding for each digit
  const multiplier = Math.max(maxLength - 9, 0);
  return 80 + multiplier * 10;
}

export function getXDomain(data) {
  const minDate = data[0];
  const maxDate = data[data.length - 1];
  return [minDate.x, maxDate.x];
}

export function getYDomain(data) {
  if (!data.length) return [0, 10];
  const max = data.reduce((accu, { y }) => Math.max(accu, y), 0);
  const min = data.reduce((accu, { y }) => Math.min(accu, y), 0);
  if (max === min) return [0, 10];
  const maxBuffer = Math.ceil(max * Y_DOMAIN_BUFFER);
  const minBuffer = Math.floor(min * Y_DOMAIN_BUFFER);
  return [minBuffer, maxBuffer];
}

export function formatYAxisTick(value) {
  return value.toLocaleString();
}

export function getAnnotationData(xDomain, yDomain, thresholdValue) {
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  let yValue = thresholdValue;
  if (thresholdValue > yMax) yValue = yMax;
  if (thresholdValue < yMin) yValue = yMin;
  return [
    { x: xMin, y: yValue },
    { x: xMax, y: yValue },
  ];
}

//TODO: Check whether the data is fetched correctly for aggregation monitors and separate the data by group by terms
export function getDataFromResponse(response, fieldName, monitorType, groupByFields) {
  if (!response) return [];
  const isTraditionalMonitor = monitorType === MONITOR_TYPE.TRADITIONAL;

  if (isTraditionalMonitor) {
    const buckets = _.get(response, 'aggregations.over.buckets', []);
    return buckets.map(getXYValues).filter(filterInvalidYValues);
  } else {
    const buckets = _.get(response, 'aggregations.composite_agg.buckets', []);
    console.log('response: ' + JSON.stringify(response));
    console.log('buckets: ' + JSON.stringify(buckets));
    let allData = new Map();
    buckets.map((bucket) => {
      const dataPoint = getXYValuesByFieldName(bucket, fieldName);
      // Key of object is the string concat by group by field values
      const key = groupByFields.map((field) => _.get(bucket.key, field, '-')).join(', ');
      allData.has(key)
        ? allData.set(key, [dataPoint, ...allData.get(key)])
        : allData.set(key, [dataPoint]);
    });
    for (const [key, value] of allData.entries()) {
      allData.set(key, _.filter(value, filterInvalidYValues));
      console.log('key ' + key + ': ' + JSON.stringify(value));
    }
    console.log('Object.fromEntries(allData): ' + JSON.stringify(Object.fromEntries(allData)));
    return buckets
      .map((bucket) => getXYValuesByFieldName(bucket, fieldName))
      .filter(filterInvalidYValues);
  }
}

// Function for aggregation type monitors to get Map of data
export function getMapDataFromResponse(response, fieldName, groupByFields) {
  if (!response) return [];
  const buckets = _.get(response, 'aggregations.composite_agg.buckets', []);
  console.log('buckets: ' + JSON.stringify(buckets));
  let allData = new Map();
  buckets.map((bucket) => {
    const dataPoint = getXYValuesByFieldName(bucket, fieldName);
    // Key of object is the string concat by group by field values
    const key = groupByFields.map((field) => _.get(bucket.key, field, '-')).join(', ');
    allData.has(key)
      ? allData.set(key, [dataPoint, ...allData.get(key)])
      : allData.set(key, [dataPoint]);
  });
  for (const [key, value] of allData.entries()) {
    allData.set(key, _.filter(value, filterInvalidYValues));
    console.log('key ' + key + ': ' + JSON.stringify(value));
  }
  console.log('Object.fromEntries(allData): ' + JSON.stringify(Object.fromEntries(allData)));
  return buckets
    .map((bucket) => getXYValuesByFieldName(bucket, fieldName))
    .filter(filterInvalidYValues);
  // return Object.fromEntries(allData);
}

export function getXYValuesByFieldName(bucket, fieldName) {
  const x = new Date(bucket.key.date);
  const path = bucket[fieldName] ? `${fieldName}.value` : 'doc_count';
  const y = _.get(bucket, path, null);
  return { x, y };
}

export function getXYValues(bucket) {
  const x = new Date(bucket.key_as_string);
  const path = bucket.when ? 'when.value' : 'doc_count';
  const y = _.get(bucket, path, null);
  return { x, y };
}

export function filterInvalidYValues({ y }) {
  return !isNaN(parseFloat(y));
}

export function getMarkData(data) {
  return data.map((d) => ({ ...d, size: DEFAULT_MARK_SIZE }));
}

export function getMarkDataByKeys(data) {
  return data.map((d) => ({ ...d, size: DEFAULT_MARK_SIZE }));
}

export function getRectData(data) {
  const ONE_HOUR = 3600000;
  return data.map((d) => ({ ...d, x0: d.x - ONE_HOUR, size: DEFAULT_MARK_SIZE }));
}

//TODO: Modify aggregation title to new format with field name as title and other info in smaller text
export function getAggregationTitle(values) {
  const aggregationType = selectOptionValueToText(values.aggregationType, AGGREGATION_TYPES);
  const when = `WHEN ${aggregationType}`;
  const fieldName = _.get(values, 'fieldName[0].label');
  const of = `OF ${fieldName}`;
  const overDocuments = values.overDocuments;
  const over = `OVER ${overDocuments}`;
  const value = values.bucketValue;
  const unit = selectOptionValueToText(values.bucketUnitOfTime, UNITS_OF_TIME);
  const forTheLast = `FOR THE LAST ${value} ${unit}`;

  if (aggregationType === 'count()') {
    return `${when} ${over} ${forTheLast}`;
  }

  return `${when} ${of} ${over} ${forTheLast}`;
}

export function getCustomAggregationTitle(values, fieldName, aggregationType) {
  // const aggregationType = selectOptionValueToText(values.aggregationType, AGGREGATION_TYPES);
  const when = `WHEN ${aggregationType}`;
  // const fieldName = _.get(values, 'fieldName[0].label');
  const of = `OF ${fieldName}`;
  const overDocuments = values.overDocuments;
  const over = `OVER ${overDocuments}`;
  const value = values.bucketValue;
  const unit = selectOptionValueToText(values.bucketUnitOfTime, UNITS_OF_TIME);
  const forTheLast = `FOR THE LAST ${value} ${unit}`;

  if (aggregationType === 'count()') {
    return `${when} ${over} ${forTheLast}`;
  }

  return `${when} ${of} ${over} ${forTheLast}`;
}
