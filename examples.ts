export const DEFAULT_TEMPLATE = `<h1>{{.title}}</h1>

{{#cond .title}}
  {{.subtitle}}
  <ul>
    {{#loop .things}}
      {{#cond .link}}
        <li><a href="{{.link}}">{{.name}}</a></li>
      {{/cond}}
    {{/loop}}
  </ul>
{{/cond}}
`
