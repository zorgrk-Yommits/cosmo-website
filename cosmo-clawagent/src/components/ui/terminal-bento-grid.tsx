import React from 'react';
import { cn } from '@/lib/utils';

interface BentoItemProps {
  className?: string;
  children: React.ReactNode;
}

const BentoItem = ({ className, children }: BentoItemProps) => {
  return (
    <div className={cn('bento-item', className)}>
      {children}
    </div>
  );
};

export default BentoItem;
