import React from 'react';
import './Contributors.css';

const contributors = [
  { filename: 'Kavya Sri V.jpg', name: 'Kavya Sri V' },
  { filename: 'Roshni Banu S.jpg', name: 'Roshni Banu S' },
  { filename: 'Abhijith M.jpg', name: 'Abhijith M' },
  { filename: 'Divapriya B.jpg', name: 'Divapriya B' },
  { filename: 'Deepak R.jpg', name: 'Deepak R' },
];

const Contributors = () => {
  return (
    <div className="contributors-container">
      <h3>Contributors</h3>
      <div className="contributors-grid">
        {contributors.map(({ filename, name }) => (
          <div className="contributor" key={filename}>
            <img
              src={`/${filename}`}
              alt={name}
              className="contributor-img"
            />
            <div className="contributor-name">{name}</div>
            <div className="contributor-year">B.E CSE 3rd year</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contributors; 