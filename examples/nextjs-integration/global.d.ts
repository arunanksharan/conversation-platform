// TypeScript definitions for Kuzushi Widget custom element

declare namespace JSX {
  interface IntrinsicElements {
    'kuzushi-widget': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'project-id'?: string;
        'api-base-url'?: string;
      },
      HTMLElement
    >;
  }
}
