export const DEFAULT_TEMPLATE = `<h1>{{.title}}</h1>

{{#if .body}}
  <article>{{.body}}</article>
  <ul>
    {{#loop .related}}
      <li>{{.name}}</li>
    {{/loop}}
  </ul>
{{/if}}`
