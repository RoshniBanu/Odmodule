import React from 'react';
import './Contributors.css';

const Contributors = ({ images }) => {
  return (
    <div className="contributors-container">
      <h3>Contributors</h3>
      <div className="contributors-grid">
        {images.map((filename) => {
          const name = filename.replace(/\.[^/.]+$/, ''); // Remove extension
          return (
            <div className="contributor" key={filename}>
              <img
                src={`/${filename}`}
                alt={name}
                className="contributor-img"
              />
              <div className="contributor-name">{name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Contributors; 