import React, { useState, useEffect, useRef } from 'react';
import { Container, Navbar, Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import { FileEarmarkArrowUp, FileEarmarkArrowDown, InfoCircleFill, Image, FileEarmarkCode } from 'react-bootstrap-icons';
import JsonEditor from './components/JsonEditor';
import BpmnViewer from './components/BpmnViewer';
import Welcome from './components/Welcome';
import { convertPlanDefinitionToBpmn } from './lib/plandefinition-to-bpmn';
import { saveAs } from 'file-saver';
import './styles/App.css';
import samplePlanDefinition from './sample-plandefinition.json';

const App: React.FC = () => {
    const [planDefinitionJson, setPlanDefinitionJson] = useState(JSON.stringify(samplePlanDefinition, null, 2));
    const [bpmnXml, setBpmnXml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedElement, setSelectedElement] = useState<any | null>(null);
    const bpmnViewerRef = useRef<any>(null);

    // Ensure default XML is passed to BpmnViewer
    useEffect(() => {
        setIsLoading(true);
        try {
            const planDefinition = JSON.parse(planDefinitionJson);
            const xml = convertPlanDefinitionToBpmn(planDefinition);
            setBpmnXml(xml);
            setError(null);
        } catch (e: any) {
            setError('Invalid JSON or transformation error: ' + e.message);
            setBpmnXml('<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">\n<bpmn:process id="Process_1" isExecutable="false"/>\n</bpmn:definitions>');
        } finally {
            setIsLoading(false);
        }
    }, [planDefinitionJson]);

    const handleJsonChange = (value: string | undefined) => {
        if (value) {
            setPlanDefinitionJson(value);
        }
    };

    const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setPlanDefinitionJson(content);
            };
            reader.readAsText(file);
        }
    };

    const handleSaveJson = () => {
        const blob = new Blob([planDefinitionJson], { type: 'application/json;charset=utf-8' });
        saveAs(blob, 'plandefinition.json');
    };

    const handleExportBpmn = () => {
        if (bpmnXml) {
            const blob = new Blob([bpmnXml], { type: 'application/xml;charset=utf-8' });
            saveAs(blob, 'diagram.bpmn');
        }
    };

    const handleExportSvg = async () => {
        if (bpmnViewerRef.current) {
            try {
                await bpmnViewerRef.current.exportSVG();
            } catch (error) {
                console.error('Error exporting SVG:', error);
                setError('Failed to export SVG');
            }
        }
    };

    const handleExportPng = async () => {
        if (bpmnViewerRef.current) {
            try {
                await bpmnViewerRef.current.exportPNG();
            } catch (error) {
                console.error('Error exporting PNG:', error);
                setError('Failed to export PNG');
            }
        }
    };
    
    const handleElementClick = (element: any) => {
        setSelectedElement(element);
    };

    return (
        <>
            <Navbar bg="primary" variant="dark" expand="lg" className="mb-3">
                <Container fluid>
                    <Navbar.Brand href="#">PlanDefinition to BPMN Viewer</Navbar.Brand>
                </Container>
            </Navbar>
            <Container fluid className="app-container">
                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                <div className="layout d-flex">
                    <div className="editor-container" style={{flex: '0 0 40%'}}>
                        <h5>PlanDefinition JSON</h5>
                        <div className="mb-2">
                            <input id="formFile" type="file" style={{display: 'none'}} onChange={handleLoadFile} accept=".json" />
                            <Button variant="secondary" size="sm" onClick={() => (document.getElementById('formFile') as HTMLInputElement).click()}>
                                <FileEarmarkArrowUp className="me-1" />
                                Load JSON
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleSaveJson} className="ms-2">
                                <FileEarmarkArrowDown className="me-1" />
                                Save JSON
                            </Button>
                            <Button variant="outline-secondary" size="sm" onClick={() => {
                                try {
                                    const parsed = JSON.parse(planDefinitionJson);
                                    setPlanDefinitionJson(JSON.stringify(parsed, null, 2));
                                    setError(null);
                                } catch (e:any) {
                                    setError('Cannot format JSON: ' + e.message);
                                }
                            }} className="ms-2">
                                Format JSON
                            </Button>
                        </div>
                        <JsonEditor value={planDefinitionJson} onChange={handleJsonChange} />
                    </div>
                    <div className="viewer-container" style={{flex: '1'}}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">BPMN Diagram</h5>
                            <div>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm" 
                                    onClick={handleExportBpmn} 
                                    disabled={!bpmnXml}
                                    className="me-2"
                                >
                                    <FileEarmarkCode className="me-1" />
                                    Export BPMN
                                </Button>
                                <Button 
                                    variant="outline-success" 
                                    size="sm" 
                                    onClick={handleExportSvg} 
                                    disabled={!bpmnXml}
                                    className="me-2"
                                >
                                    <FileEarmarkArrowDown className="me-1" />
                                    Export SVG
                                </Button>
                                <Button 
                                    variant="outline-info" 
                                    size="sm" 
                                    onClick={handleExportPng} 
                                    disabled={!bpmnXml}
                                >
                                    <Image className="me-1" />
                                    Export PNG
                                </Button>
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="text-center"><Spinner animation="border" variant="primary" /></div>
                        ) : bpmnXml ? (
                            <BpmnViewer 
                                ref={bpmnViewerRef}
                                xml={bpmnXml} 
                                onElementClick={handleElementClick} 
                            />
                        ) : (
                            <Welcome />
                        )}
                    </div>
                </div>
                {selectedElement && (
                    <Card className="mt-3">
                        <Card.Header>
                            <InfoCircleFill className="me-2"/> 
                            Element Details: {selectedElement.type || 'Unknown'} 
                            {selectedElement.businessObject?.name && ` - ${selectedElement.businessObject.name}`}
                        </Card.Header>
                        <Card.Body>
                            <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
                                {JSON.stringify(selectedElement, null, 2)}
                            </pre>
                        </Card.Body>
                    </Card>
                )}
            </Container>
        </>
    );
};

export default App;