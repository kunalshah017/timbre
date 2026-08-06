import { render, screen } from '@testing-library/react'
import { LiveVisualizer } from './LiveVisualizer'

describe('LiveVisualizer', () => {
  it('labels the microphone waveform for assistive technology', () => {
    render(<LiveVisualizer stream={null} active={false} />)

    expect(screen.getByLabelText('Live microphone waveform')).toBeInTheDocument()
  })
})
