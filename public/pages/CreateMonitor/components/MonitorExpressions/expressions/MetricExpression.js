/*
 *   Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import React, { Component } from 'react';
import { connect } from 'formik';

import {
  EuiText,
  EuiPopover,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { Expressions, POPOVER_STYLE, AGGREGATION_TYPES, EXPRESSION_STYLE } from './utils/constants';
import { FormikComboBox, FormikSelect } from '../../../../../components/FormControls';
import { getIndexFields } from './utils/dataTypes';
import { getOfExpressionAllowedTypes } from './utils/helpers';
import _ from 'lodash';
import { FORMIK_INITIAL_AGG_VALUES } from '../../../containers/CreateMonitor/utils/constants';
import { MetricItem } from './index';

class MetricExpression extends Component {
  onChangeWrapper = (e, field, form, arrayHelpers, index) => {
    const {
      formik: { values },
    } = this.props;
    this.props.onMadeChanges();
    if (values.aggregations.length <= index)
      arrayHelpers.push(_.cloneDeep(FORMIK_INITIAL_AGG_VALUES));
    field.onChange(e);
  };

  onChangeFieldWrapper = (options, field, form, index) => {
    this.props.onMadeChanges();
    form.setFieldValue(`aggregations[${index}].fieldName`, options);
  };

  renderPopover = (options, closeExpression, expressionWidth, arrayHelpers, index) => (
    <div
      style={{
        width: Math.max(expressionWidth, 180),
        height: 220,
        ...POPOVER_STYLE,
        ...EXPRESSION_STYLE,
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Aggregation</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <FormikSelect
            name={`aggregations[${index}].aggregationType`}
            inputProps={{
              arrayHelpers,
              index,
              onChange: this.onChangeWrapper,
              options: AGGREGATION_TYPES,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Field</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <FormikComboBox
            name={`aggregations[${index}].fieldName`}
            inputProps={{
              placeholder: 'Select a field',
              options,
              onChange: this.onChangeFieldWrapper,
              isClearable: false,
              singleSelection: { asPlainText: true },
              'data-test-subj': 'ofFieldComboBox',
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem>
          <EuiButtonEmpty onClick={() => closeExpression()}>Cancel</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            fill
            onClick={() => {
              closeExpression();
            }}
          >
            Save
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );

  renderFieldItems = (arrayHelpers, fieldOptions, expressionWidth) => {
    const {
      formik: { values },
    } = this.props;
    return values.aggregations.map((aggregation, index) => {
      // let isOpen = false;
      return (
        <MetricItem
          values={values}
          arrayHelpers={arrayHelpers}
          fieldOptions={fieldOptions}
          expressionWidth={expressionWidth}
          aggregation={aggregation}
          index={index}
        />
        // <EuiPopover
        //   id="metric-badge-popover"
        //   button={
        //     <div>
        //       <EuiBadge
        //         iconSide="right"
        //         iconType={index ? 'cross' : ''}
        //         iconOnClick={() => arrayHelpers.remove(index)}
        //         iconOnClickAriaLabel="Remove metric"
        //         onClick={() => {
        //           isOpen = true;
        //         }}
        //         onClickAriaLabel="Edit metric"
        //       >
        //         {aggregation.aggregationType} of {aggregation.fieldName}
        //       </EuiBadge>{' '}
        //     </div>
        //   }
        //   isOpen
        //   closePopover={() => (isOpen = false)}
        //   panelPaddingSize="none"
        //   ownFocus
        //   withTitle
        //   anchorPosition="downLeft"
        // >
        //   {this.renderPopover(
        //     fieldOptions,
        //     () => (isOpen = false),
        //     expressionWidth,
        //     arrayHelpers,
        //     values.aggregations.length
        //   )}
        // </EuiPopover>
      );
    });
  };

  render() {
    const {
      formik: { values },
      arrayHelpers,
      openedStates,
      closeExpression,
      openExpression,
      dataTypes,
    } = this.props;

    const fieldOptions = getIndexFields(dataTypes, getOfExpressionAllowedTypes(values));
    const expressionWidth =
      Math.max(
        ...fieldOptions.map(({ options }) =>
          options.reduce((accu, curr) => Math.max(accu, curr.label.length), 0)
        )
      ) *
        8 +
      60;
    return (
      <div>
        <EuiText size="xs">
          <h4>Metrics</h4>
        </EuiText>
        {/*TODO:Add badges here*/}
        {this.renderFieldItems(
          arrayHelpers,
          fieldOptions,
          openExpression,
          closeExpression,
          expressionWidth
        )}
        <EuiButtonEmpty
          size="xs"
          onClick={() => {
            // openExpression(Expressions.METRICS);
            arrayHelpers.push(_.cloneDeep(FORMIK_INITIAL_AGG_VALUES));
            //Debug
            console.log('Aggs: ' + JSON.stringify(values));
          }}
          data-test-subj="addMetricButton"
        >
          + Add metric
        </EuiButtonEmpty>
      </div>
    );
  }
}

export default connect(MetricExpression);
