import React from 'react';
import Editor from '@monaco-editor/react';

interface JsonEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange }) => {
    return (
        <Editor
            height="calc(100vh - 180px)"
            language="json"
            value={value}
            onChange={onChange}
            options={{
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on'
            }}
        />
    );
};

export default JsonEditor;
