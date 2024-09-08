import React from 'react';
import { mergeClasses } from "@/app/lib/utils";

const cardStyles = "max-w-sm rounded overflow-hidden shadow-lg";

type CardProps = {
  children?: React.ReactNode;
  className?: string;
};

const Card: React.FC<CardProps> = ({className, children }) => {
  return (
    <div 
      className={className ? mergeClasses(cardStyles, className) : cardStyles}
    >
      {children}
    </div>
  );
};

export { Card };