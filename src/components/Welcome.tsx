import React from 'react';
import { Card } from 'react-bootstrap';

const Welcome: React.FC = () => {
    return (
        <Card className="h-100">
            <Card.Body className="d-flex flex-column justify-content-center align-items-center">
                <Card.Title>Welcome to the PlanDefinition Viewer</Card.Title>
                <Card.Text className="text-center">
                    Paste your FHIR PlanDefinition JSON in the editor on the left to see it rendered as a BPMN diagram.<br />
                    You can also load a JSON file from your computer.
                </Card.Text>
            </Card.Body>
        </Card>
    );
};

export default Welcome;
