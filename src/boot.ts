import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as localforage from 'localforage'
import App from '~/components/app'

const initialLoad = (savedTemplate: string | null) => {
  ReactDOM.render(
    React.createElement(App, {
      template: savedTemplate || '',
      onChange: saveNewTemplate,
    }),
    document.querySelector('#main')
  )
}

const saveNewTemplate = (newTemplate: string) => {
  localforage.setItem('template', newTemplate)
}

localforage.getItem<string>('template').then(initialLoad)
