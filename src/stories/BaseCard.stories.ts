import type { Meta, StoryFn, StoryObj } from '@storybook/vue3'
import BaseCard from '@/components/ui/BaseCard.vue'

const meta: Meta<typeof BaseCard> = {
  title: 'UI/BaseCard',
  component: BaseCard,
  args: {
    variant: 'default',
    padding: 'md',
    hoverable: false,
    clickable: false
  }
}

export default meta
type Story = StoryObj<typeof BaseCard>

const renderCard: StoryFn<typeof BaseCard> = (args) => ({
  components: { BaseCard },
  setup() {
    return { args }
  },
  template: `
    <BaseCard v-bind="args">
      <template #header>
        <div class="text-sm text-[var(--color-text-secondary)]">Card Header</div>
      </template>
      <div class="space-y-2">
        <div class="text-lg font-semibold text-[var(--color-text)]">Card Title</div>
        <div class="text-sm text-[var(--color-text-secondary)]">
          This is a flexible card component using the shared design tokens.
        </div>
      </div>
      <template #footer>
        <div class="text-xs text-[var(--color-text-muted)]">Footer slot</div>
      </template>
    </BaseCard>
  `
})

export const Default: Story = {
  render: renderCard,
  args: { variant: 'default' }
}

export const Elevated: Story = {
  render: renderCard,
  args: { variant: 'elevated', hoverable: true }
}

export const Outlined: Story = {
  render: renderCard,
  args: { variant: 'outlined' }
}

export const Filled: Story = {
  render: renderCard,
  args: { variant: 'filled' }
}
