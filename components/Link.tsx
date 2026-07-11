import React from 'react';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  target?: string;
}

export default function Link({ href, children, target, ...props }: LinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only handle normal left clicks without modifier keys
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (target && target !== '_self') {
        return; // Let browser handle it (e.g. _blank)
      }
      
      // Check if it's an external link
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        return; // Let standard navigation handle it
      }

      e.preventDefault();
      
      // Update the URL and trigger routing update
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <a href={href} onClick={handleClick} target={target} {...props}>
      {children}
    </a>
  );
}
