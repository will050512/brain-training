import type { Meta, StoryFn, StoryObj } from '@storybook/vue3'
import BaseButton from '@/components/ui/BaseButton.vue'

const meta: Meta<typeof BaseButton> = {
  title: 'UI/BaseButton',
  component: BaseButton,
  args: {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    fullWidth: false,
    icon: ''
  }
}

export default meta
type Story = StoryObj<typeof BaseButton>

const renderButton: StoryFn<typeof BaseButton> = (args) => ({
  components: { BaseButton },
  setup() {
    return { args }
  },
  template: '<BaseButton v-bind="args">Button</BaseButton>'
})

export const Primary: Story = {
  render: renderButton,
  args: { variant: 'primary' }
}

export const Secondary: Story = {
  render: renderButton,
  args: { variant: 'secondary' }
}

export const Outline: Story = {
  render: renderButton,
  args: { variant: 'outline' }
}

export const Ghost: Story = {
  render: renderButton,
  args: { variant: 'ghost' }
}

export const Danger: Story = {
  render: renderButton,
  args: { variant: 'danger' }
}

export const WithIcon: Story = {
  render: (args) => ({
    components: { BaseButton },
    setup() {
      return { args }
    },
    template: '<BaseButton v-bind="args" icon="★">Favorite</BaseButton>'
  }),
  args: { variant: 'primary' }
}

export const Loading: Story = {
  render: renderButton,
  args: { loading: true }
}
