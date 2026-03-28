import React from 'react';

const ShrikeBoard = ({ ledState }) => {
    return (
        <svg width="300" height="180" viewBox="0 0 300 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Board Body */}
            <rect width="300" height="180" rx="12" fill="#1a1a1a" stroke="#333" strokeWidth="2" />

            {/* USB-C Connector */}
            <rect x="120" y="0" width="60" height="15" rx="2" fill="#444" />

            {/* RP2040 Chip */}
            <rect x="125" y="65" width="50" height="50" rx="4" fill="#111" stroke="#444" />
            <text x="132" y="95" fill="#555" fontSize="8" fontFamily="monospace">RP2040</text>

            {/* User LED (GP0) */}
            <circle
                cx="30"
                cy="30"
                r="8"
                fill={ledState ? "#ff0033" : "#222"}
                style={{
                    transition: 'all 0.1s',
                    filter: ledState ? 'drop-shadow(0 0 8px #ff0033)' : 'none'
                }}
            />
            <text x="45" y="35" fill="#888" fontSize="10" fontFamily="monospace">USER_LED</text>

            {/* Board Markings */}
            <text x="220" y="165" fill="#333" fontSize="12" fontWeight="bold" fontFamily="monospace">SHRIKE LITE</text>
        </svg>
    );
};

export default ShrikeBoard;