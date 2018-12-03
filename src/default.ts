export const DEFAULT_TEMPLATE = `<h1>{{.title}}</h1>

<main>
{{#match .article}}
  <article>{{.text}}</article>

{{:or}}
  <h2>Links:</h2>
  <ul>
  {{#loop .links}}
    <a src="{{.href}}">{{.text}}</a>
  {{/loop}}
  </ul>

{{:or}}
  <h2>Gallery:</h2>
  <ul>
  {{#loop .images}}
    <img src="{{.src}}" alt="{{.alt}}" />
  {{/loop}}
  </ul>

{{/match}}
</main>
`
