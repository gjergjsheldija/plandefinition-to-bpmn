/**
 * plandefinition-to-bpmn.ts
 * Converts FHIR PlanDefinition to BPMN 2.0 XML
 */

import { BpmnFactory, BpmnElement, BpmnDiElement } from './BpmnFactory';

interface FhirPlanDefinition {
  resourceType: string;
  id?: string;
  title?: string;
  description?: string;
  action?: FhirAction[];
}

interface FhirAction {
  id?: string;
  title?: string;
  description?: string;
  textEquivalent?: string;
  documentation?: Array<{
    type?: string;
    display?: string;
  }>;
  trigger?: Array<{
    type?: string;
    name?: string;
  }>;
  condition?: Array<{
    kind?: string;
    expression?: {
      language?: string;
      expression?: string;
    };
  }>;
  relatedAction?: Array<{
    actionId?: string;
    relationship?: string;
  }>;
  type?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  dynamicValue?: Array<{
    path?: string;
    expression?: {
      language?: string;
      expression?: string;
    };
  }>;
  action?: FhirAction[]; // Nested actions
}

/**
 * Converts a FHIR PlanDefinition to BPMN 2.0 XML
 */
export function convertPlanDefinitionToBpmn(planDefinition: any): string {
  try {
    // Validate input
    if (!planDefinition || planDefinition.resourceType !== 'PlanDefinition') {
      throw new Error('Invalid PlanDefinition: resourceType must be "PlanDefinition"');
    }

    const factory = new BpmnFactory();
    const processId = planDefinition.id || 'Process_1';
    const processName = planDefinition.title || 'PlanDefinition Process';
    const processDescription = planDefinition.description;

    // Create start event
    const startEventId = factory.createStartEvent();
    let lastElementId = startEventId;

    // Process actions
    if (planDefinition.action && planDefinition.action.length > 0) {
      lastElementId = processActions(factory, planDefinition.action, lastElementId);
    } else {
      console.warn('PlanDefinition has no actions');
    }

    // Create end event
    const endEventId = factory.createEndEvent('temp_incoming');
    factory.createSequenceFlow(lastElementId, endEventId);

    // Generate BPMN XML
    const bpmnJson = factory.getBpmnJson();
    return generateBpmnXml(processId, processName, processDescription, bpmnJson.elements, bpmnJson.diElements);
  } catch (error) {
    console.error('Error converting PlanDefinition to BPMN:', error);
    throw error;
  }
}

/**
 * Processes an array of FHIR actions and creates corresponding BPMN elements
 */
function processActions(
  factory: BpmnFactory,
  actions: FhirAction[],
  previousElementId: string
): string {
  let lastElementId = previousElementId;

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionName = action.title || action.description || `Action ${i + 1}`;

    // Build documentation from various fields
    const documentation = buildActionDocumentation(action);

    // Check if action has triggers (create intermediate event)
    if (action.trigger && action.trigger.length > 0) {
      const triggerNames = action.trigger.map(t => t.name || t.type).filter(Boolean).join(', ');
      const eventId = factory.createIntermediateEvent(
        `Trigger: ${triggerNames}`,
        'temp_incoming',
        documentation
      );
      factory.createSequenceFlow(lastElementId, eventId);
      lastElementId = eventId;
    }

    // Check if action has conditions (create gateway)
    if (action.condition && action.condition.length > 0) {
      const condition = action.condition[0];
      const conditionText = condition.expression?.expression || 'Check Condition';
      
      // Create exclusive gateway for conditional logic
      const gatewayId = factory.createExclusiveGateway(
        `Decision: ${conditionText}`,
        'temp_incoming'
      );
      
      // Create flow to gateway
      factory.createSequenceFlow(lastElementId, gatewayId);

      // Create task after gateway (when condition is true)
      const taskId = factory.createTask(actionName, 'temp_incoming', documentation);
      
      // Create conditional flow from gateway to task
      factory.createSequenceFlow(
        gatewayId,
        taskId,
        condition.expression?.expression,
        'Yes'
      );

      lastElementId = taskId;

      // Handle nested actions
      if (action.action && action.action.length > 0) {
        lastElementId = processActions(factory, action.action, lastElementId);
      }
    } else {
      // Create simple task
      const taskId = factory.createTask(actionName, 'temp_incoming', documentation);
      
      // Create flow to task
      factory.createSequenceFlow(lastElementId, taskId);

      lastElementId = taskId;

      // Handle nested actions (sub-actions)
      if (action.action && action.action.length > 0) {
        lastElementId = processActions(factory, action.action, lastElementId);
      }
    }
  }

  return lastElementId;
}

/**
 * Builds documentation text from various action fields
 */
function buildActionDocumentation(action: FhirAction): string {
  const docParts: string[] = [];

  if (action.description) {
    docParts.push(`Description: ${action.description}`);
  }

  if (action.textEquivalent) {
    docParts.push(`Text: ${action.textEquivalent}`);
  }

  if (action.type?.coding && action.type.coding.length > 0) {
    const types = action.type.coding.map(c => c.display || c.code).filter(Boolean).join(', ');
    docParts.push(`Type: ${types}`);
  }

  if (action.trigger && action.trigger.length > 0) {
    const triggers = action.trigger.map(t => `${t.type || 'event'}: ${t.name || 'unnamed'}`).join('; ');
    docParts.push(`Triggers: ${triggers}`);
  }

  if (action.condition && action.condition.length > 0) {
    action.condition.forEach((cond, idx) => {
      const condText = cond.expression?.expression || 'condition';
      const condLang = cond.expression?.language ? ` (${cond.expression.language})` : '';
      docParts.push(`Condition ${idx + 1}: ${condText}${condLang}`);
    });
  }

  if (action.dynamicValue && action.dynamicValue.length > 0) {
    action.dynamicValue.forEach((dv, idx) => {
      const expr = dv.expression?.expression || 'expression';
      const path = dv.path || 'path';
      const lang = dv.expression?.language ? ` (${dv.expression.language})` : '';
      docParts.push(`Dynamic Value ${idx + 1}: ${path} = ${expr}${lang}`);
    });
  }

  if (action.documentation && action.documentation.length > 0) {
    action.documentation.forEach((doc, idx) => {
      if (doc.display) {
        docParts.push(`Documentation ${idx + 1}: ${doc.display}`);
      }
    });
  }

  return docParts.join('\n');
}

/**
 * Generates BPMN 2.0 XML from BPMN elements
 */
function generateBpmnXml(
  processId: string,
  processName: string,
  processDescription: string | undefined,
  elements: BpmnElement[],
  diElements: BpmnDiElement[]
): string {
  const xml: string[] = [];

  // XML Header
  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push('<bpmn:definitions ' +
    'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
    'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" ' +
    'id="Definitions_1" ' +
    'targetNamespace="http://bpmn.io/schema/bpmn">');

  // Process
  xml.push(`  <bpmn:process id="${escapeXml(processId)}" name="${escapeXml(processName)}" isExecutable="true">`);

  // Add process documentation if available
  if (processDescription) {
    xml.push(`    <bpmn:documentation>${escapeXml(processDescription)}</bpmn:documentation>`);
  }

  // Add all elements
  for (const element of elements) {
    xml.push(generateElementXml(element, '    '));
  }

  xml.push('  </bpmn:process>');

  // BPMN Diagram Interchange (DI)
  xml.push(`  <bpmndi:BPMNDiagram id="BPMNDiagram_1">`);
  xml.push(`    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${escapeXml(processId)}">`);

  for (const diElement of diElements) {
    xml.push(generateDiXml(diElement, '      '));
  }

  xml.push('    </bpmndi:BPMNPlane>');
  xml.push('  </bpmndi:BPMNDiagram>');
  xml.push('</bpmn:definitions>');

  return xml.join('\n');
}

/**
 * Generates XML for a single BPMN element
 */
function generateElementXml(element: BpmnElement, indent: string): string {
  const lines: string[] = [];

  switch (element.type) {
    case 'startEvent':
      lines.push(`${indent}<bpmn:startEvent id="${escapeXml(element.id)}" name="${escapeXml(element.name || '')}">`);
      if (element.documentation) {
        lines.push(`${indent}  <bpmn:documentation>${escapeXml(element.documentation)}</bpmn:documentation>`);
      }
      if (element.outgoing && element.outgoing.length > 0) {
        element.outgoing.forEach(out => {
          lines.push(`${indent}  <bpmn:outgoing>${escapeXml(out)}</bpmn:outgoing>`);
        });
      }
      lines.push(`${indent}</bpmn:startEvent>`);
      break;

    case 'endEvent':
      lines.push(`${indent}<bpmn:endEvent id="${escapeXml(element.id)}" name="${escapeXml(element.name || '')}">`);
      if (element.documentation) {
        lines.push(`${indent}  <bpmn:documentation>${escapeXml(element.documentation)}</bpmn:documentation>`);
      }
      if (element.incoming && element.incoming.length > 0) {
        element.incoming.forEach(inc => {
          lines.push(`${indent}  <bpmn:incoming>${escapeXml(inc)}</bpmn:incoming>`);
        });
      }
      lines.push(`${indent}</bpmn:endEvent>`);
      break;

    case 'intermediateEvent':
      lines.push(`${indent}<bpmn:intermediateCatchEvent id="${escapeXml(element.id)}" name="${escapeXml(element.name || '')}">`);
      if (element.documentation) {
        lines.push(`${indent}  <bpmn:documentation>${escapeXml(element.documentation)}</bpmn:documentation>`);
      }
      if (element.incoming && element.incoming.length > 0) {
        element.incoming.forEach(inc => {
          lines.push(`${indent}  <bpmn:incoming>${escapeXml(inc)}</bpmn:incoming>`);
        });
      }
      if (element.outgoing && element.outgoing.length > 0) {
        element.outgoing.forEach(out => {
          lines.push(`${indent}  <bpmn:outgoing>${escapeXml(out)}</bpmn:outgoing>`);
        });
      }
      lines.push(`${indent}</bpmn:intermediateCatchEvent>`);
      break;

    case 'task':
      lines.push(`${indent}<bpmn:task id="${escapeXml(element.id)}" name="${escapeXml(element.name || '')}">`);
      if (element.documentation) {
        lines.push(`${indent}  <bpmn:documentation>${escapeXml(element.documentation)}</bpmn:documentation>`);
      }
      if (element.incoming && element.incoming.length > 0) {
        element.incoming.forEach(inc => {
          lines.push(`${indent}  <bpmn:incoming>${escapeXml(inc)}</bpmn:incoming>`);
        });
      }
      if (element.outgoing && element.outgoing.length > 0) {
        element.outgoing.forEach(out => {
          lines.push(`${indent}  <bpmn:outgoing>${escapeXml(out)}</bpmn:outgoing>`);
        });
      }
      lines.push(`${indent}</bpmn:task>`);
      break;

    case 'exclusiveGateway':
      lines.push(`${indent}<bpmn:exclusiveGateway id="${escapeXml(element.id)}" name="${escapeXml(element.name || '')}">`);
      if (element.documentation) {
        lines.push(`${indent}  <bpmn:documentation>${escapeXml(element.documentation)}</bpmn:documentation>`);
      }
      if (element.incoming && element.incoming.length > 0) {
        element.incoming.forEach(inc => {
          lines.push(`${indent}  <bpmn:incoming>${escapeXml(inc)}</bpmn:incoming>`);
        });
      }
      if (element.outgoing && element.outgoing.length > 0) {
        element.outgoing.forEach(out => {
          lines.push(`${indent}  <bpmn:outgoing>${escapeXml(out)}</bpmn:outgoing>`);
        });
      }
      lines.push(`${indent}</bpmn:exclusiveGateway>`);
      break;

    case 'sequenceFlow':
      const attrs = [
        `id="${escapeXml(element.id)}"`,
        `sourceRef="${escapeXml(element.sourceRef || '')}"`,
        `targetRef="${escapeXml(element.targetRef || '')}"`
      ];
      if (element.name) {
        attrs.push(`name="${escapeXml(element.name)}"`);
      }
      
      if (element.conditionExpression) {
        lines.push(`${indent}<bpmn:sequenceFlow ${attrs.join(' ')}>`);
        lines.push(`${indent}  <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${escapeXml(element.conditionExpression)}</bpmn:conditionExpression>`);
        lines.push(`${indent}</bpmn:sequenceFlow>`);
      } else {
        lines.push(`${indent}<bpmn:sequenceFlow ${attrs.join(' ')} />`);
      }
      break;
  }

  return lines.join('\n');
}

/**
 * Generates XML for BPMN DI elements
 */
function generateDiXml(diElement: BpmnDiElement, indent: string): string {
  const lines: string[] = [];

  if (diElement.waypoints) {
    // Sequence flow edge
    lines.push(`${indent}<bpmndi:BPMNEdge id="${escapeXml(diElement.id)}" bpmnElement="${escapeXml(diElement.bpmnElement)}">`);
    diElement.waypoints.forEach(wp => {
      lines.push(`${indent}  <di:waypoint x="${wp.x}" y="${wp.y}" />`);
    });
    lines.push(`${indent}</bpmndi:BPMNEdge>`);
  } else {
    // Shape (event, task, gateway)
    lines.push(`${indent}<bpmndi:BPMNShape id="${escapeXml(diElement.id)}" bpmnElement="${escapeXml(diElement.bpmnElement)}">`);
    lines.push(`${indent}  <dc:Bounds x="${diElement.x}" y="${diElement.y}" width="${diElement.width}" height="${diElement.height}" />`);
    lines.push(`${indent}</bpmndi:BPMNShape>`);
  }

  return lines.join('\n');
}

/**
 * Escapes special XML characters
 */
function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Example usage and test function
 */
export function testConverter(): void {
  const samplePlanDefinition = {
    resourceType: 'PlanDefinition',
    id: 'example-plan',
    title: 'Patient Care Pathway',
    action: [
      {
        id: 'action-1',
        title: 'Initial Assessment',
        description: 'Perform initial patient assessment'
      },
      {
        id: 'action-2',
        title: 'Check Eligibility',
        condition: [
          {
            kind: 'applicability',
            expression: {
              expression: 'patient.age >= 18'
            }
          }
        ],
        action: [
          {
            id: 'action-2-1',
            title: 'Adult Treatment Protocol'
          }
        ]
      },
      {
        id: 'action-3',
        title: 'Follow-up Appointment',
        description: 'Schedule follow-up'
      }
    ]
  };

  try {
    const bpmnXml = convertPlanDefinitionToBpmn(samplePlanDefinition);
    console.log('Generated BPMN XML:');
    console.log(bpmnXml);
  } catch (error) {
    console.error('Test failed:', error);
  }
}