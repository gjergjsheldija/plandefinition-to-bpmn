/**
 * BpmnFactory.ts
 * Factory class for creating BPMN 2.0 elements with Diagram Interchange (DI) support
 */

export interface BpmnElement {
  id: string;
  type: string;
  name?: string;
  documentation?: string;
  incoming?: string[];
  outgoing?: string[];
  sourceRef?: string;
  targetRef?: string;
  conditionExpression?: string;
  default?: string;
}

export interface BpmnDiElement {
  id: string;
  bpmnElement: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  waypoints?: { x: number; y: number }[];
}

export class BpmnFactory {
  private elements: BpmnElement[] = [];
  private diElements: BpmnDiElement[] = [];
  private elementCounter = 0;
  private flowCounter = 0;
  private currentX = 100; // Track horizontal position for layout
  private currentY = 150; // Center Y position
  private readonly HORIZONTAL_SPACING = 180;
  private readonly TASK_WIDTH = 120;
  private readonly TASK_HEIGHT = 80;
  private readonly GATEWAY_SIZE = 50;
  private readonly EVENT_SIZE = 36;

  /**
   * Generates a unique ID for BPMN elements
   */
  private generateId(prefix: string): string {
    return `${prefix}_${++this.elementCounter}`;
  }

  /**
   * Generates a unique ID for sequence flows
   */
  private generateFlowId(): string {
    return `Flow_${++this.flowCounter}`;
  }

  /**
   * Calculates the center Y coordinate for an element based on its height
   */
  private getCenterY(elementHeight: number): number {
    return this.currentY - elementHeight / 2;
  }

  /**
   * Advances the X position for the next element
   */
  private advanceX(elementWidth: number): void {
    this.currentX += elementWidth + this.HORIZONTAL_SPACING;
  }

  /**
   * Creates a BPMN start event
   */
  createStartEvent(): string {
    const id = this.generateId('StartEvent');
    this.elements.push({
      id,
      type: 'startEvent',
      name: 'Start',
      outgoing: []
    });

    // Add DI for visualization
    this.diElements.push({
      id: `${id}_di`,
      bpmnElement: id,
      x: this.currentX,
      y: this.getCenterY(this.EVENT_SIZE),
      width: this.EVENT_SIZE,
      height: this.EVENT_SIZE
    });

    this.advanceX(this.EVENT_SIZE);

    return id;
  }

  /**
   * Creates a BPMN end event
   */
  createEndEvent(incomingFlowId: string): string {
    const id = this.generateId('EndEvent');
    this.elements.push({
      id,
      type: 'endEvent',
      name: 'End',
      incoming: [incomingFlowId]
    });

    // Add DI for visualization
    this.diElements.push({
      id: `${id}_di`,
      bpmnElement: id,
      x: this.currentX,
      y: this.getCenterY(this.EVENT_SIZE),
      width: this.EVENT_SIZE,
      height: this.EVENT_SIZE
    });

    this.advanceX(this.EVENT_SIZE);

    return id;
  }

  /**
   * Creates a BPMN task element
   */
  createTask(name: string, incomingFlowId: string, documentation?: string): string {
    const id = this.generateId('Task');
    this.elements.push({
      id,
      type: 'task',
      name,
      documentation,
      incoming: [incomingFlowId],
      outgoing: []
    });

    // Add DI for visualization
    this.diElements.push({
      id: `${id}_di`,
      bpmnElement: id,
      x: this.currentX,
      y: this.getCenterY(this.TASK_HEIGHT),
      width: this.TASK_WIDTH,
      height: this.TASK_HEIGHT
    });

    this.advanceX(this.TASK_WIDTH);

    return id;
  }

  /**
   * Creates a BPMN exclusive gateway (decision point)
   */
  createExclusiveGateway(name: string, incomingFlowId: string): string {
    const id = this.generateId('Gateway');
    this.elements.push({
      id,
      type: 'exclusiveGateway',
      name,
      incoming: [incomingFlowId],
      outgoing: []
    });

    // Add DI for visualization
    this.diElements.push({
      id: `${id}_di`,
      bpmnElement: id,
      x: this.currentX,
      y: this.getCenterY(this.GATEWAY_SIZE),
      width: this.GATEWAY_SIZE,
      height: this.GATEWAY_SIZE
    });

    this.advanceX(this.GATEWAY_SIZE);

    return id;
  }

  /**
   * Creates a BPMN intermediate catch event
   */
  createIntermediateEvent(name: string, incomingFlowId: string, documentation?: string): string {
    const id = this.generateId('IntermediateEvent');
    this.elements.push({
      id,
      type: 'intermediateEvent',
      name,
      documentation,
      incoming: [incomingFlowId],
      outgoing: []
    });

    // Add DI for visualization
    this.diElements.push({
      id: `${id}_di`,
      bpmnElement: id,
      x: this.currentX,
      y: this.getCenterY(this.EVENT_SIZE),
      width: this.EVENT_SIZE,
      height: this.EVENT_SIZE
    });

    this.advanceX(this.EVENT_SIZE);

    return id;
  }

  /**
   * Creates a sequence flow connecting two elements
   */
  createSequenceFlow(
    sourceId: string,
    targetId: string,
    conditionExpression?: string,
    name?: string
  ): string {
    const id = this.generateFlowId();
    const flow: BpmnElement = {
      id,
      type: 'sequenceFlow',
      sourceRef: sourceId,
      targetRef: targetId
    };

    if (name) flow.name = name;
    if (conditionExpression) flow.conditionExpression = conditionExpression;

    this.elements.push(flow);

    // Update source element's outgoing
    const sourceElement = this.elements.find(e => e.id === sourceId);
    if (sourceElement) {
      if (!sourceElement.outgoing) sourceElement.outgoing = [];
      sourceElement.outgoing.push(id);
    }

    // Update target element's incoming
    const targetElement = this.elements.find(e => e.id === targetId);
    if (targetElement) {
      if (!targetElement.incoming) targetElement.incoming = [];
      targetElement.incoming.push(id);
    }

    // Add DI for the flow
    const sourceShape = this.diElements.find(di => di.bpmnElement === sourceId);
    const targetShape = this.diElements.find(di => di.bpmnElement === targetId);

    if (sourceShape && targetShape) {
      const sourceX = (sourceShape.x || 0) + (sourceShape.width || 0);
      const sourceY = (sourceShape.y || 0) + (sourceShape.height || 0) / 2;
      const targetX = targetShape.x || 0;
      const targetY = (targetShape.y || 0) + (targetShape.height || 0) / 2;

      this.diElements.push({
        id: `${id}_di`,
        bpmnElement: id,
        waypoints: [
          { x: sourceX, y: sourceY },
          { x: targetX, y: targetY }
        ]
      });
    }

    return id;
  }

  /**
   * Gets the current X position
   */
  getCurrentX(): number {
    return this.currentX;
  }

  /**
   * Sets the current X position
   */
  setCurrentX(x: number): void {
    this.currentX = x;
  }

  /**
   * Gets the current Y position
   */
  getCurrentY(): number {
    return this.currentY;
  }

  /**
   * Sets the current Y position
   */
  setCurrentY(y: number): void {
    this.currentY = y;
  }

  /**
   * Gets the complete BPMN structure as JSON
   */
  getBpmnJson(): { elements: BpmnElement[]; diElements: BpmnDiElement[] } {
    return {
      elements: this.elements,
      diElements: this.diElements
    };
  }

  /**
   * Finds an element by ID
   */
  getElementById(id: string): BpmnElement | undefined {
    return this.elements.find(e => e.id === id);
  }

  /**
   * Gets all elements of a specific type
   */
  getElementsByType(type: string): BpmnElement[] {
    return this.elements.filter(e => e.type === type);
  }

  /**
   * Gets the DI element for a BPMN element
   */
  getDiElement(bpmnElementId: string): BpmnDiElement | undefined {
    return this.diElements.find(di => di.bpmnElement === bpmnElementId);
  }
}