import '../src/style.css'
import type { Preview } from '@storybook/vue3'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#f7f8fb' },
        { name: 'surface', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' }
      ]
    }
  }
}

export default preview
