import { Fragment, type ReactNode } from 'react';
import { findUrls } from '../../domain/url-utils';

function normalizeHref(value: string): string {
  return value.startsWith('www.') ? `https://${value}` : value;
}

/**
 * Renders text with any URLs turned into anchors, without using
 * `dangerouslySetInnerHTML`. Only http/https/www links are linkified (the
 * `url-utils` regex enforces this), and each anchor gets `rel="noopener
 * noreferrer"` + `target="_blank"`.
 */
export function Linkify({ text }: { text: string }): ReactNode {
  const urls = findUrls(text);
  if (urls.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  urls.forEach((url, index) => {
    if (url.start > cursor) {
      nodes.push(<Fragment key={`t${index}`}>{text.slice(cursor, url.start)}</Fragment>);
    }
    nodes.push(
      <a
        key={`u${index}`}
        href={normalizeHref(url.value)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {url.value}
      </a>,
    );
    cursor = url.end;
  });
  if (cursor < text.length) {
    nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }

  return <>{nodes}</>;
}
