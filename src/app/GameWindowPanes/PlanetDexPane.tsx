import React, { useContext, useEffect, useState ,SetStateAction, Dispatch} from 'react';
import styled from 'styled-components';
import { White} from '../../components/Text';
import {
  ModalPane,
  ModalHook,
  ModalName,
  ModalPlanetDexIcon,
} from './ModalPane';
import {DefenseIcon, RangeIcon, SpeedIcon} from '../Icons'
import GameUIManager from '../board/GameUIManager';
import GameUIManagerContext from '../board/GameUIManagerContext';
import { Planet, PlanetResource,UpgradeBranchName,SpaceType } from '../../_types/global/GlobalTypes';
import UIEmitter, { UIEmitterEvent } from '../../utils/UIEmitter';
import { SidebarPane } from '../GameWindowComponents/GameWindowComponents';
import { Sub, Space } from '../../components/Text';
import {
  getPlanetShortHash,
  formatNumber,
  getPlanetRank,
  planetCanUpgrade,
  canUpgrade
} from '../../utils/Utils';
import dfstyles from '../../styles/dfstyles';
import {
  getPlanetName,
  getPlanetCosmetic,
  getPlanetClass,
  rgbStr,
} from '../../utils/ProcgenUtils';
import _ from 'lodash';
import { SelectedContext } from '../GameWindow';
import { SilverIcon } from '../Icons';
import { engineConsts } from '../renderer/utils/EngineConsts';
import { RGBVec } from '../renderer/utils/EngineTypes';

const DexWrapperSmall = styled.div`
  max-height: 12em;
  overflow-y: scroll;

  & > span > div {
    // rows
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    & > span:last-child {
      width: 2.5em;
      height: 30px;
    }

    &.selected {
      & > span:first-child {
        text-decoration: underline;
        color: ${dfstyles.colors.text};
      }
    }
    &:hover {
      cursor: pointer;
      & > span:first-child {
        color: ${dfstyles.colors.text};
      }
    }
  }
`;

function DexSmallRow({
  planet,
  className,
}: {
  planet: Planet;
  className: string;
}) {
  const getFormatName = (planet: Planet): string => {
    const myName = getPlanetName(planet);
    if (myName.length >= 20) return myName.substring(0, 17) + '...';
    else return myName;
  };
  return (
    <PlanetLink planet={planet}>
      <div className={className}>
        <Sub>{getFormatName(planet)}</Sub>
        <span>
          <PlanetThumb planet={planet} />
        </span>
      </div>
    </PlanetLink>
  );
}

const DexWrapper = styled.div`
  width: 38em;
  min-height: 15em;
  height: fit-content;
  max-height: 25.2em; // exact size so a row is cut off
  overflow-y: scroll;
`;

const DexRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  height: 30px; // 5 + 3 * 7 + 4px

  & > span {
    &:nth-child(1) {
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      width: 3em;
      position: relative; // for planetcircle
    }
    &:nth-child(2) {
      // short hash
      margin-right: 0.5em;
    }
    &:nth-child(3) {
      flex-grow: 1;
    }
    &:nth-child(4) {
      // planet level
      margin-right: 1em;
      width: 3em;
    }
    // energy, silver
    &:nth-child(5) {
      width: 4.5em;
    }
    &:nth-child(6) {
      width: 4.5em;
    }
    // score
    &:nth-child(7) {
      width: 10em;
    }
  }

  &.title-row > span {
    color: ${dfstyles.colors.subtext};

    &.selected {
      text-decoration: underline;
      color: ${dfstyles.colors.text};
    }

    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }

    &.selected {
      text-decoration: underline;
    }

    &:nth-child(1),
    &:nth-child(2) {
      text-decoration: none;
      pointer-events: none;
      &:hover {
        text-decoration: none;
      }
    }
  }

  &:hover:not(.title-row) {
    cursor: pointer;
    & > span:nth-child(3) {
      text-decoration: underline;
    }
  }

  &.selected {
    background: ${dfstyles.colors.backgroundlight};
    & > span:nth-child(2) span:last-child {
      text-decoration: underline;
    }
  }
`;
const StyledPlanetThumb = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  & > span {
    // these guys wrap the icons
    position: absolute;
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
  }
`;

const ColorIcon = styled.span<{ color: string }>`
  path {
    fill: ${({ color }) => color} !important;
  }
`;

export function PlanetThumb({ planet }: { planet: Planet }) {
  const radius = 5 + 3 * planet.planetLevel;
  // const radius = 5 + 3 * PlanetLevel.MAX;
  const { speed, range, defense } = engineConsts.colors.belt;
  const { baseStr } = getPlanetCosmetic(planet);

  const ringColor = (): string => {
    const myClass = getPlanetClass(planet);
    const myColor: RGBVec = [defense, range, speed][myClass];
    return rgbStr(myColor);
  };

  const ringW = radius * 1.5;
  const ringH = Math.max(2, ringW / 7);

  if (planet.planetResource === PlanetResource.SILVER) {
    return (
      <StyledPlanetThumb>
        <ColorIcon color={baseStr}>
          <SilverIcon />
        </ColorIcon>
      </StyledPlanetThumb>
    );
  }

  return (
    <StyledPlanetThumb>
      <span>
        <span
          style={{
            width: radius + 'px',
            height: radius + 'px',
            borderRadius: radius / 2 + 'px',
            background: baseStr,
          }}
        ></span>
      </span>
      <span>
        <span
          style={{
            width: ringW + 'px',
            height: ringH + 'px',
            borderRadius: ringW * 2 + 'px',
            background: getPlanetRank(planet) > 0 ? ringColor() : 'none',
          }}
        ></span>
      </span>
    </StyledPlanetThumb>
  );
}

const getPlanetScore = (planet: Planet, rank: number) => {
  const baseScore = rank < 10 ? planet.energyCap : 0;
  const totalSilver = planet.silverSpent + planet.silver;
  return baseScore + totalSilver / 10;
};
const StyledUpgradeButton = styled.div<{ active: boolean }>`
  // flex-grow: 1;
  &:last-child {
    margin-right: 0;
  }

  border-radius: 2px;
  border: 1px solid ${dfstyles.colors.subtext};
  padding: 0.2em 0;

  text-align: center;

  &:hover {
    cursor: pointer;
    border: 1px solid ${dfstyles.colors.text};
  }

  background: ${({ active }) => (active ? dfstyles.colors.text : 'none')};

  &,
  & span {
    ${({ active }) =>
      active && `color: ${dfstyles.colors.background} !important`};
  }

  &.disabled {
    border: 1px solid ${dfstyles.colors.subtext} !important;
    &,
    & span {
      color: ${dfstyles.colors.subtext} !important;
      cursor: auto !important;
    }
  }
`;

function UpgradeButton({
  branch,
  hook,
  disabled,
  planet,
}: {
  branch: UpgradeBranchName;
  hook: BranchHook;
  disabled: boolean;
  planet: Planet | null;
}) {
  if (!planet) return <></>;

  const [myBranch, setBranch] = hook;
  const BranchIcon = [DefenseIcon, RangeIcon, SpeedIcon][branch]
  return (
    <StyledUpgradeButton
      onClick={() => disabled || setBranch(branch)}
      active={branch === myBranch}
      className={disabled ? 'disabled' : ''}
    >
      (lv<White>{planet.upgradeState[branch]}</White>)
    </StyledUpgradeButton>
  );
}

type BranchHook = [
  UpgradeBranchName | null,
  Dispatch<SetStateAction<UpgradeBranchName | null>>
];
const SectionButtons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;
function UpgradeRow({planet}: {planet: Planet}){
  const branchHook = useState<UpgradeBranchName | null>(null);
  const disabled: boolean[] = planetCanUpgrade(planet)
  ? planet?.upgradeState.map((level, i) => {
      if (
        i === UpgradeBranchName.Defense &&
        planet.spaceType === SpaceType.DEEP_SPACE
      )
        return level >= 2;
      return level >= 4;
    }) || [true, true, true]
  : [true, true, true];

          return  <SectionButtons>
            <UpgradeButton
              branch={0}
              hook={branchHook}
              disabled={disabled[0]}
              planet={planet}
            />
            <UpgradeButton
              branch={1}
              hook={branchHook}
              disabled={disabled[1]}
              planet={planet}
            />
            <UpgradeButton
              branch={2}
              hook={branchHook}
              disabled={disabled[2]}
              planet={planet}
            />
          </SectionButtons>
}


function DexEntry({
  planet,
  className,
  score,
}: {
  planet: Planet;
  className: string;
  score: number;
}) {
  return (
    <PlanetLink planet={planet}>
      <DexRow className={className}>
        <span>
          <PlanetThumb planet={planet} />
        </span>
        <span>
          <Sub>{getPlanetShortHash(planet)}</Sub>
        </span>
        <span>
          <span>{getPlanetName(planet)}</span>
        </span>
        <span>
          <Sub>lv</Sub> {planet.planetLevel}
        </span>
        <span>{formatNumber(planet.energy)}</span>
        <span>{formatNumber(planet.silver)}</span>
        <span><UpgradeRow planet={planet}></UpgradeRow></span>
      </DexRow>
    </PlanetLink>
  );
}

export function PlanetLink({
  planet,
  children,
}: {
  planet: Planet;
  children: React.ReactNode;
}) {
  const uiManager = useContext<GameUIManager | null>(GameUIManagerContext);
  const uiEmitter = UIEmitter.getInstance();

  return (
    <span
      onClick={() => {
        uiManager?.setSelectedPlanet(planet);
        uiEmitter.emit(UIEmitterEvent.CenterPlanet, planet);
      }}
    >
      {children}
    </span>
  );
}

enum Columns {
  Name = 0,
  Level = 1,
  Energy = 2,
  Silver = 3,
  Points = 4,
}

export function PlanetDexPane({
  hook,
  small,
}: {
  small?: boolean;
  hook: ModalHook;
}) {
  const [visible, _setVisible] = hook;
  const uiManager = useContext<GameUIManager | null>(GameUIManagerContext);
  const selected = useContext<Planet | null>(SelectedContext);

  const [sortBy, setSortBy] = useState<Columns>(Columns.Points);

  const scoreFn = (a: [Planet, number], b: [Planet, number]): number => {
    const [scoreA, scoreB] = [getPlanetScore(...a), getPlanetScore(...b)];
    return scoreB - scoreA;
  };

  const nameFn = (a: [Planet, number], b: [Planet, number]): number => {
    const [nameA, nameB] = [getPlanetName(a[0]), getPlanetName(b[0])];
    return nameA.localeCompare(nameB);
  };

  const energyFn = (a: [Planet, number], b: [Planet, number]): number => {
    return b[0].energy - a[0].energy;
  };

  const silverFn = (a: [Planet, number], b: [Planet, number]): number => {
    return b[0].silver - a[0].silver;
  };

  const levelFn = (a: [Planet, number], b: [Planet, number]): number => {
    return b[0].planetLevel - a[0].planetLevel;
  };

  const sortingFn = (a: [Planet, number], b: [Planet, number]): number => {
    const [scoreA, scoreB] = [getPlanetScore(...a), getPlanetScore(...b)];
    const myFn = [nameFn, levelFn, energyFn, silverFn, scoreFn][sortBy];
    if (scoreA !== scoreB) return myFn(a, b);

    if (!uiManager) return 0;
    const locA = uiManager.getLocationOfPlanet(a[0].locationId);
    const locB = uiManager.getLocationOfPlanet(a[0].locationId);
    if (!locA || !locB) return 0;
    const { x: xA, y: yA } = locA.coords;
    const { x: xB, y: yB } = locB.coords;

    if (xA !== xB) return xA - xB;
    return yA - yB;
  };

  const [planets, setPlanets] = useState<Planet[]>([]);

  // update planet list on open / close
  useEffect(() => {
    if (!uiManager) return;
    const myAddr = uiManager.getAccount();
    if (!myAddr) return;
    const ownedPlanets = uiManager
      .getAllOwnedPlanets()
      .filter((planet) => planet.owner === myAddr);
    setPlanets(ownedPlanets);
  }, [visible, uiManager]);

  useEffect(() => {
    if (!uiManager) return;

    const refreshPlanets = () => {
      if (!uiManager) return;
      const myAddr = uiManager.getAccount();
      if (!myAddr) return;
      const ownedPlanets = uiManager
        .getAllOwnedPlanets()
        .filter((planet) => planet.owner === myAddr);
      setPlanets(ownedPlanets);
    };

    const intervalId = setInterval(refreshPlanets, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [uiManager]);

  if (small)
    return (
      <SidebarPane
        title='Planet List'
        headerItems={<ModalPlanetDexIcon hook={hook} />}
      >
        <DexWrapperSmall>
          {planets
            .sort((a, b) => b.energyCap - a.energyCap)
            .map((planet, i) => [planet, i]) // pass the index
            .sort(sortingFn) // sort using planet + index
            .map(([planet, i]: [Planet, number]) => (
              <DexSmallRow
                className={
                  selected?.locationId === planet.locationId ? 'selected' : ''
                }
                key={i}
                planet={planet}
              />
            ))}
        </DexWrapperSmall>
      </SidebarPane>
    );
  return (
    <ModalPane hook={hook} title='Planet Dex' name={ModalName.PlanetDex}>
      <DexWrapper>
        <DexRow className='title-row'>
          <span></span> {/* empty icon cell */}
          <span>
            <Space length={5} />
          </span>{' '}
          {/* empty icon cell */}
          <span
            className={sortBy === Columns.Name ? 'selected' : ''}
            onClick={() => setSortBy(Columns.Name)}
          >
            Planet Name
          </span>
          <span
            className={sortBy === Columns.Level ? 'selected' : ''}
            onClick={() => setSortBy(Columns.Level)}
          >
            Level
          </span>
          <span
            className={sortBy === Columns.Energy ? 'selected' : ''}
            onClick={() => setSortBy(Columns.Energy)}
          >
            Energy
          </span>
          <span
            className={sortBy === Columns.Silver ? 'selected' : ''}
            onClick={() => setSortBy(Columns.Silver)}
          >
            Silver
          </span>
          <span
            className={sortBy === Columns.Points ? 'selected' : ''}
            onClick={() => setSortBy(Columns.Points)}
          >
            Points
          </span>
        </DexRow>
        {planets
          .sort((a, b) => b.energyCap - a.energyCap)
          .map((planet, i) => [planet, i]) // pass the index
          .sort(sortingFn) // sort using planet + index
          .map(([planet, i]: [Planet, number]) => (
            <DexEntry
              key={i}
              planet={planet}
              score={getPlanetScore(planet, i)}
              className={
                selected?.locationId === planet.locationId ? 'selected' : ''
              }
            />
          ))}
      </DexWrapper>
    </ModalPane>
  );
}
