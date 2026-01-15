import type { Meta, StoryFn, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const meta: Meta<typeof BaseInput> = {
  title: 'UI/BaseInput',
  component: BaseInput,
  args: {
    label: 'Label',
    placeholder: 'Type here...',
    size: 'md',
    disabled: false,
    error: '',
    hint: 'Helper text',
    icon: '✦'
  }
}

export default meta
type Story = StoryObj<typeof BaseInput>

export const Default: Story = {
  render: (args) => ({
    components: { BaseInput },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template: '<BaseInput v-bind="args" v-model="value" />'
  })
}

export const WithError: Story = {
  render: (args) => ({
    components: { BaseInput },
    setup() {
      const value = ref('example')
      return { args, value }
    },
    template: '<BaseInput v-bind="args" v-model="value" />'
  }),
  args: {
    error: 'Please check this field.',
    hint: ''
  }
}

export const Disabled: Story = {
  render: (args) => ({
    components: { BaseInput },
    setup() {
      const value = ref('Disabled value')
      return { args, value }
    },
    template: '<BaseInput v-bind="args" v-model="value" />'
  }),
  args: { disabled: true }
}
