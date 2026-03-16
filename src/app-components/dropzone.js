import React from 'react';
import { useDropzone } from 'react-dropzone';

function Dropzone({ hasImage, onImageSelected }) {
  const onDrop = React.useCallback(
    (acceptedFiles) => {
      const [file] = acceptedFiles;

      if (file) {
        onImageSelected(file);
      }
    },
    [onImageSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': []
    },
    multiple: false,
    onDrop
  });

  if (hasImage) {
    return null;
  }

  return (
    <div className="allInputContainer">
      <div className="container">
        <div {...getRootProps({ className: 'dropzone' })}>
          <input {...getInputProps()} />
          <p>{isDragActive ? 'Drop the image here' : 'Drag and drop a file here or click to select a file'}</p>
        </div>
      </div>
    </div>
  );
}

export default Dropzone;
