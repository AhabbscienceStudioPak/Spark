'use client';

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

/**
 * Req 29.5: Tutorial tooltips for merchant onboarding.
 */
export function Tooltip({ content, children }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <span
        role="button"
        tabIndex={0}
        aria-label={`Help: ${content}`}
        style={styles.icon}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        ?
      </span>
      {visible && (
        <span style={styles.tooltip} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  icon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 18, height: 18, borderRadius: '50%',
    background: '#E9ECEF', color: '#6C757D',
    fontSize: 11, fontWeight: 700, cursor: 'help',
    flexShrink: 0,
  },
  tooltip: {
    position: 'absolute', bottom: '130%', left: '50%',
    transform: 'translateX(-50%)',
    background: '#1A1A2E', color: '#FFFFFF',
    padding: '8px 12px', borderRadius: 8,
    fontSize: 13, lineHeight: '1.5',
    whiteSpace: 'nowrap', maxWidth: 280,
    whiteSpaceCollapse: 'preserve',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
  },
};
