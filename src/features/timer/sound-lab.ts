/**
 * Listening page for the songs and jingles, served by the dev server at /sound-lab.html.
 * Not part of the build (Vite builds only index.html).
 */

import { ANIMALS, type Animal } from '@/features/family/schema'
import { brushingAudio } from './audio'

const NAMES: Record<Animal, string> = {
  fox: 'Fuchs',
  hedgehog: 'Igel',
  owl: 'Eule',
  rabbit: 'Hase',
  squirrel: 'Eichhörnchen',
  bear: 'Bär',
  koala: 'Koala',
}

function button(label: string, onClick: () => void) {
  const b = document.createElement('button')
  b.textContent = label
  b.addEventListener('click', () => {
    brushingAudio.unlock()
    onClick()
  })
  return b
}

function row(title: string, ...buttons: HTMLButtonElement[]) {
  const div = document.createElement('div')
  div.className = 'row'
  const name = document.createElement('strong')
  name.textContent = title
  div.append(name, ...buttons)
  return div
}

const lab = document.getElementById('lab')!
let timers: ReturnType<typeof setTimeout>[] = []
const stopAll = () => {
  for (const id of timers) clearTimeout(id)
  timers = []
  brushingAudio.stopMusic()
}

for (const animal of ANIMALS) {
  lab.append(
    row(
      NAMES[animal],
      button('Lied', () => {
        stopAll()
        brushingAudio.setAnimal(animal)
        brushingAudio.startMusic()
      }),
      button('Jingle', () => {
        brushingAudio.setAnimal(animal)
        brushingAudio.switchJingle()
      }),
    ),
  )
}

lab.append(
  row(
    'Alle',
    button('Alle Jingles', () => {
      stopAll()
      ANIMALS.forEach((animal, i) => {
        timers.push(
          setTimeout(() => {
            brushingAudio.setAnimal(animal)
            brushingAudio.switchJingle()
          }, i * 2500),
        )
      })
    }),
    button('Schlussmelodie', () => brushingAudio.finishMelody()),
    button('Stopp', stopAll),
  ),
)
