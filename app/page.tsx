"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRelight3D, type Relight3DController, type RelightInteraction, type RelightLight, type RelightView } from "./relight3d";

type Direction = "左侧" | "左前侧" | "正前方" | "右前侧" | "右侧" | "顶部" | "底部" | "后方";
type LightType = "大面积柔光" | "窗光" | "聚光" | "硬质侧光" | "顶柔光";
type LightRole = "主光" | "辅光" | "轮廓光" | "背光" | "侧光" | "顶光" | "底光" | "背景光" | "追光" | "效果光";
type Scene = "电影人像" | "室内叙事" | "夜景氛围" | "产品静物" | "舞台演出";
type SidebarTab = "lights" | "global" | "prompt";
type Angles = { azimuth: number; elevation: number };
type LightConfig = RelightLight & { role: LightRole; quality: LightType };
type LightPreset = {
  label: Exclude<LightRole, "效果光">;
  summary: string;
  role: LightRole;
  quality: LightType;
  angles: Angles;
  distance: number;
  beamAngle: number;
  intensity: number;
  temperature: number;
};
type PresetLight = Omit<LightConfig, "id" | "enabled">;
type LightGroupPreset = { id: string; scene: Scene; label: string; summary: string; lights: PresetLight[] };

const directions: Direction[] = ["左侧", "左前侧", "正前方", "右前侧", "右侧", "顶部", "底部", "后方"];
const lightTypes: LightType[] = ["大面积柔光", "窗光", "聚光", "硬质侧光", "顶柔光"];
const scenes: Scene[] = ["电影人像", "室内叙事", "夜景氛围", "产品静物", "舞台演出"];
const addLightAngles: Angles[] = [
  { azimuth: 58, elevation: 38 }, { azimuth: -126, elevation: 28 }, { azimuth: 14, elevation: 66 },
  { azimuth: 116, elevation: -12 }, { azimuth: -72, elevation: -28 }, { azimuth: 158, elevation: 48 }, { azimuth: 28, elevation: -42 },
];
const addLightDistances = [2.1, 1.3, 2.6, 1.9, 2.8, 1.4, 2.4];

const directionAngles: Record<Direction, Angles> = {
  左侧: { azimuth: -90, elevation: 0 }, 左前侧: { azimuth: -45, elevation: 0 }, 正前方: { azimuth: 0, elevation: 0 },
  右前侧: { azimuth: 45, elevation: 0 }, 右侧: { azimuth: 90, elevation: 0 }, 顶部: { azimuth: 0, elevation: 90 },
  底部: { azimuth: 0, elevation: -90 }, 后方: { azimuth: -180, elevation: 0 },
};

const lightPresets: LightPreset[] = [
  { label: "主光", summary: "左前 · 柔光", role: "主光", quality: "大面积柔光", angles: { azimuth: -45, elevation: 0 }, distance: 1.6, beamAngle: 70, intensity: 48, temperature: 4600 },
  { label: "辅光", summary: "右前 · 宽束", role: "辅光", quality: "大面积柔光", angles: { azimuth: 60, elevation: 30 }, distance: 2.1, beamAngle: 95, intensity: 26, temperature: 5200 },
  { label: "轮廓光", summary: "右后 · 窄束", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 30 }, distance: 1.5, beamAngle: 40, intensity: 58, temperature: 6500 },
  { label: "背光", summary: "正后 · 中束", role: "背光", quality: "聚光", angles: { azimuth: -180, elevation: 30 }, distance: 1.8, beamAngle: 60, intensity: 65, temperature: 5600 },
  { label: "侧光", summary: "左侧 · 硬光", role: "侧光", quality: "硬质侧光", angles: { azimuth: -90, elevation: 15 }, distance: 1.5, beamAngle: 55, intensity: 58, temperature: 4300 },
  { label: "顶光", summary: "正上 · 柔光", role: "顶光", quality: "顶柔光", angles: { azimuth: 0, elevation: 90 }, distance: 1.2, beamAngle: 90, intensity: 50, temperature: 5000 },
  { label: "底光", summary: "正下 · 效果", role: "底光", quality: "聚光", angles: { azimuth: 0, elevation: -90 }, distance: 1.1, beamAngle: 65, intensity: 36, temperature: 3200 },
  { label: "背景光", summary: "后侧 · 泛照", role: "背景光", quality: "大面积柔光", angles: { azimuth: 150, elevation: -15 }, distance: 2.6, beamAngle: 115, intensity: 32, temperature: 6800 },
  { label: "追光", summary: "正前 · 聚光", role: "追光", quality: "聚光", angles: { azimuth: 0, elevation: 30 }, distance: 2.4, beamAngle: 25, intensity: 82, temperature: 5600 },
];

const lightGroupPresets: LightGroupPreset[] = [
  {
    id: "key-fill", scene: "电影人像", label: "主光 + 辅光", summary: "2 灯 · 柔和低反差", lights: [
      { name: "主光 1", role: "主光", quality: "大面积柔光", angles: { azimuth: -45, elevation: 30 }, distance: 1.6, beamAngle: 70, intensity: 65, temperature: 4800 },
      { name: "辅光 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 45, elevation: 15 }, distance: 2.1, beamAngle: 115, intensity: 34, temperature: 5000 },
    ],
  },
  {
    id: "key-rim", scene: "电影人像", label: "主光 + 轮廓", summary: "2 灯 · 立体分离", lights: [
      { name: "主光 1", role: "主光", quality: "大面积柔光", angles: { azimuth: -45, elevation: 30 }, distance: 1.6, beamAngle: 70, intensity: 65, temperature: 4800 },
      { name: "轮廓光 2", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 45 }, distance: 1.6, beamAngle: 40, intensity: 55, temperature: 6500 },
    ],
  },
  {
    id: "three-point", scene: "电影人像", label: "经典三点布光", summary: "3 灯 · 主辅轮廓", lights: [
      { name: "主光 1", role: "主光", quality: "大面积柔光", angles: { azimuth: -45, elevation: 30 }, distance: 1.6, beamAngle: 70, intensity: 65, temperature: 4800 },
      { name: "辅光 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 45, elevation: 15 }, distance: 2.2, beamAngle: 115, intensity: 28, temperature: 5000 },
      { name: "轮廓光 3", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 45 }, distance: 1.6, beamAngle: 40, intensity: 55, temperature: 6500 },
    ],
  },
  {
    id: "rembrandt", scene: "电影人像", label: "伦勃朗光", summary: "2 灯 · 戏剧肖像", lights: [
      { name: "伦勃朗主光 1", role: "主光", quality: "窗光", angles: { azimuth: -45, elevation: 45 }, distance: 1.4, beamAngle: 55, intensity: 72, temperature: 4300 },
      { name: "微弱填充 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 30, elevation: 0 }, distance: 2.7, beamAngle: 125, intensity: 10, temperature: 5000 },
    ],
  },
  {
    id: "butterfly", scene: "电影人像", label: "蝴蝶光", summary: "2 灯 · 轴线美妆", lights: [
      { name: "蝴蝶主光 1", role: "主光", quality: "顶柔光", angles: { azimuth: 0, elevation: 45 }, distance: 1.5, beamAngle: 65, intensity: 66, temperature: 5000 },
      { name: "下方填充 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 0, elevation: -15 }, distance: 2.3, beamAngle: 110, intensity: 18, temperature: 5200 },
    ],
  },
  {
    id: "split", scene: "电影人像", label: "分割侧光", summary: "2 灯 · 强烈明暗", lights: [
      { name: "侧向主光 1", role: "侧光", quality: "硬质侧光", angles: { azimuth: -90, elevation: 0 }, distance: 1.4, beamAngle: 50, intensity: 72, temperature: 4200 },
      { name: "暗部填充 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 45, elevation: 0 }, distance: 2.8, beamAngle: 125, intensity: 8, temperature: 5200 },
    ],
  },
  {
    id: "cinematic-cross", scene: "电影人像", label: "电影冷暖交叉", summary: "3 灯 · 氛围叙事", lights: [
      { name: "暖色主光 1", role: "主光", quality: "窗光", angles: { azimuth: -45, elevation: 15 }, distance: 1.7, beamAngle: 55, intensity: 62, temperature: 3800 },
      { name: "冷色轮廓 2", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 45 }, distance: 1.5, beamAngle: 35, intensity: 58, temperature: 6800 },
      { name: "背景氛围 3", role: "背景光", quality: "大面积柔光", angles: { azimuth: -165, elevation: -15 }, distance: 2.7, beamAngle: 110, intensity: 28, temperature: 7200 },
    ],
  },
  {
    id: "indoor-window", scene: "室内叙事", label: "自然窗光", summary: "2 灯 · 日光动机", lights: [
      { name: "窗外主光 1", role: "主光", quality: "窗光", angles: { azimuth: -60, elevation: 30 }, distance: 1.7, beamAngle: 65, intensity: 64, temperature: 5600 },
      { name: "室内暖灯 2", role: "背景光", quality: "大面积柔光", angles: { azimuth: 120, elevation: 0 }, distance: 2.3, beamAngle: 95, intensity: 20, temperature: 3000 },
    ],
  },
  {
    id: "indoor-practical", scene: "室内叙事", label: "暖灯实景", summary: "3 灯 · 灯具动机", lights: [
      { name: "暖色实景主光 1", role: "主光", quality: "大面积柔光", angles: { azimuth: -45, elevation: -15 }, distance: 1.4, beamAngle: 80, intensity: 52, temperature: 3000 },
      { name: "冷窗填充 2", role: "辅光", quality: "窗光", angles: { azimuth: 45, elevation: 30 }, distance: 2.5, beamAngle: 115, intensity: 18, temperature: 6500 },
      { name: "空间层次 3", role: "背景光", quality: "聚光", angles: { azimuth: -150, elevation: 15 }, distance: 2.4, beamAngle: 60, intensity: 22, temperature: 3600 },
    ],
  },
  {
    id: "indoor-doorway", scene: "室内叙事", label: "门窗切光", summary: "3 灯 · 硬光叙事", lights: [
      { name: "门窗切光 1", role: "主光", quality: "硬质侧光", angles: { azimuth: -75, elevation: 15 }, distance: 2.0, beamAngle: 35, intensity: 68, temperature: 5600 },
      { name: "室内弱填充 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 30, elevation: 0 }, distance: 2.8, beamAngle: 125, intensity: 10, temperature: 4800 },
      { name: "后景暖光 3", role: "背景光", quality: "聚光", angles: { azimuth: -165, elevation: -15 }, distance: 2.6, beamAngle: 50, intensity: 30, temperature: 3600 },
    ],
  },
  {
    id: "indoor-overhead", scene: "室内叙事", label: "顶灯空间", summary: "3 灯 · 真实室内", lights: [
      { name: "室内顶灯 1", role: "顶光", quality: "顶柔光", angles: { azimuth: 0, elevation: 90 }, distance: 1.4, beamAngle: 100, intensity: 46, temperature: 4000 },
      { name: "正面环境填充 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 0, elevation: 15 }, distance: 2.6, beamAngle: 125, intensity: 16, temperature: 4800 },
      { name: "空间轮廓 3", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 30 }, distance: 2.0, beamAngle: 55, intensity: 25, temperature: 3400 },
    ],
  },
  {
    id: "night-moon", scene: "夜景氛围", label: "月光轮廓", summary: "3 灯 · 冷月暖灯", lights: [
      { name: "冷月轮廓 1", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 45 }, distance: 1.7, beamAngle: 40, intensity: 60, temperature: 8000 },
      { name: "暖色动机光 2", role: "主光", quality: "聚光", angles: { azimuth: -45, elevation: 0 }, distance: 1.5, beamAngle: 55, intensity: 38, temperature: 3000 },
      { name: "夜色环境填充 3", role: "辅光", quality: "大面积柔光", angles: { azimuth: 0, elevation: 0 }, distance: 2.8, beamAngle: 125, intensity: 8, temperature: 5600 },
    ],
  },
  {
    id: "night-neon", scene: "夜景氛围", label: "霓虹交叉", summary: "3 灯 · 冷暖双侧", lights: [
      { name: "暖霓虹侧光 1", role: "侧光", quality: "硬质侧光", angles: { azimuth: -60, elevation: 15 }, distance: 1.5, beamAngle: 45, intensity: 55, temperature: 2800 },
      { name: "冷霓虹侧光 2", role: "侧光", quality: "硬质侧光", angles: { azimuth: 75, elevation: 15 }, distance: 1.6, beamAngle: 45, intensity: 50, temperature: 8500 },
      { name: "城市后景光 3", role: "背景光", quality: "聚光", angles: { azimuth: -180, elevation: 30 }, distance: 2.3, beamAngle: 65, intensity: 28, temperature: 7000 },
    ],
  },
  {
    id: "night-street", scene: "夜景氛围", label: "路灯顶光", summary: "2 灯 · 暖顶冷底", lights: [
      { name: "暖色路灯 1", role: "顶光", quality: "聚光", angles: { azimuth: 0, elevation: 75 }, distance: 1.8, beamAngle: 45, intensity: 68, temperature: 3200 },
      { name: "冷夜环境 2", role: "辅光", quality: "大面积柔光", angles: { azimuth: 135, elevation: 15 }, distance: 2.8, beamAngle: 125, intensity: 12, temperature: 7800 },
    ],
  },
  {
    id: "night-silhouette", scene: "夜景氛围", label: "夜景剪影", summary: "2 灯 · 强背光", lights: [
      { name: "剪影背光 1", role: "背光", quality: "硬质侧光", angles: { azimuth: -180, elevation: 30 }, distance: 1.6, beamAngle: 70, intensity: 82, temperature: 7500 },
      { name: "微弱暖侧光 2", role: "侧光", quality: "聚光", angles: { azimuth: -90, elevation: 0 }, distance: 2.4, beamAngle: 50, intensity: 10, temperature: 3000 },
    ],
  },
  {
    id: "product-white", scene: "产品静物", label: "电商白底三灯", summary: "3 灯 · 均匀准确", lights: [
      { name: "顶部基础光 1", role: "顶光", quality: "顶柔光", angles: { azimuth: 0, elevation: 75 }, distance: 1.4, beamAngle: 110, intensity: 55, temperature: 5500 },
      { name: "侧向塑形光 2", role: "主光", quality: "大面积柔光", angles: { azimuth: 45, elevation: 30 }, distance: 1.3, beamAngle: 75, intensity: 62, temperature: 5500 },
      { name: "白底背景光 3", role: "背景光", quality: "大面积柔光", angles: { azimuth: -180, elevation: 0 }, distance: 2.0, beamAngle: 120, intensity: 68, temperature: 5500 },
    ],
  },
  {
    id: "product-rim", scene: "产品静物", label: "双侧轮廓", summary: "3 灯 · 玻璃金属", lights: [
      { name: "左侧轮廓 1", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: -90, elevation: 15 }, distance: 1.3, beamAngle: 40, intensity: 56, temperature: 5600 },
      { name: "右侧轮廓 2", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 90, elevation: 15 }, distance: 1.3, beamAngle: 40, intensity: 56, temperature: 5600 },
      { name: "正面弱填充 3", role: "辅光", quality: "大面积柔光", angles: { azimuth: 0, elevation: 15 }, distance: 2.3, beamAngle: 110, intensity: 24, temperature: 5500 },
    ],
  },
  {
    id: "product-top", scene: "产品静物", label: "顶部柔光", summary: "2 灯 · 柔和材质", lights: [
      { name: "顶部大柔光 1", role: "顶光", quality: "顶柔光", angles: { azimuth: 0, elevation: 90 }, distance: 1.2, beamAngle: 115, intensity: 66, temperature: 5500 },
      { name: "侧面方向光 2", role: "主光", quality: "大面积柔光", angles: { azimuth: 45, elevation: 30 }, distance: 1.8, beamAngle: 75, intensity: 32, temperature: 5500 },
    ],
  },
  {
    id: "product-hard", scene: "产品静物", label: "硬光切面", summary: "3 灯 · 结构质感", lights: [
      { name: "硬质主光 1", role: "主光", quality: "硬质侧光", angles: { azimuth: -45, elevation: 45 }, distance: 1.5, beamAngle: 30, intensity: 76, temperature: 5200 },
      { name: "边缘高光 2", role: "轮廓光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 30 }, distance: 1.5, beamAngle: 35, intensity: 45, temperature: 6500 },
      { name: "受控弱填充 3", role: "辅光", quality: "大面积柔光", angles: { azimuth: 45, elevation: 0 }, distance: 2.7, beamAngle: 120, intensity: 10, temperature: 5400 },
    ],
  },
  {
    id: "stage", scene: "舞台演出", label: "常规舞台光", summary: "4 灯 · 45/45 + 侧背", lights: [
      { name: "暖前场 1", role: "主光", quality: "聚光", angles: { azimuth: -45, elevation: 45 }, distance: 2.2, beamAngle: 50, intensity: 60, temperature: 3600 },
      { name: "冷前场 2", role: "辅光", quality: "聚光", angles: { azimuth: 45, elevation: 45 }, distance: 2.4, beamAngle: 55, intensity: 42, temperature: 5600 },
      { name: "舞台侧光 3", role: "侧光", quality: "硬质侧光", angles: { azimuth: -90, elevation: 15 }, distance: 1.6, beamAngle: 35, intensity: 48, temperature: 4200 },
      { name: "舞台背光 4", role: "背光", quality: "硬质侧光", angles: { azimuth: -180, elevation: 45 }, distance: 1.8, beamAngle: 45, intensity: 62, temperature: 7200 },
    ],
  },
  {
    id: "stage-follow", scene: "舞台演出", label: "舞台追光", summary: "3 灯 · 主角聚焦", lights: [
      { name: "主角追光 1", role: "追光", quality: "聚光", angles: { azimuth: 0, elevation: 30 }, distance: 2.7, beamAngle: 20, intensity: 90, temperature: 5600 },
      { name: "暖色侧光 2", role: "侧光", quality: "硬质侧光", angles: { azimuth: -90, elevation: 15 }, distance: 1.8, beamAngle: 35, intensity: 34, temperature: 3200 },
      { name: "冷色背光 3", role: "背光", quality: "硬质侧光", angles: { azimuth: -180, elevation: 45 }, distance: 1.8, beamAngle: 45, intensity: 58, temperature: 7200 },
    ],
  },
  {
    id: "stage-dance", scene: "舞台演出", label: "舞蹈侧光", summary: "4 灯 · 双侧塑形", lights: [
      { name: "左侧舞蹈光 1", role: "侧光", quality: "硬质侧光", angles: { azimuth: -90, elevation: 0 }, distance: 1.4, beamAngle: 35, intensity: 62, temperature: 4200 },
      { name: "右侧舞蹈光 2", role: "侧光", quality: "硬质侧光", angles: { azimuth: 90, elevation: 0 }, distance: 1.4, beamAngle: 35, intensity: 62, temperature: 6200 },
      { name: "左后轮廓 3", role: "轮廓光", quality: "聚光", angles: { azimuth: -135, elevation: 45 }, distance: 1.8, beamAngle: 45, intensity: 44, temperature: 7200 },
      { name: "右后轮廓 4", role: "轮廓光", quality: "聚光", angles: { azimuth: 135, elevation: 45 }, distance: 1.8, beamAngle: 45, intensity: 44, temperature: 3600 },
    ],
  },
  {
    id: "stage-concert", scene: "舞台演出", label: "演唱会冷暖", summary: "4 灯 · 交叉光束", lights: [
      { name: "暖前场 1", role: "主光", quality: "聚光", angles: { azimuth: -45, elevation: 30 }, distance: 2.2, beamAngle: 40, intensity: 56, temperature: 3200 },
      { name: "冷前场 2", role: "辅光", quality: "聚光", angles: { azimuth: 45, elevation: 30 }, distance: 2.2, beamAngle: 40, intensity: 50, temperature: 7600 },
      { name: "暖后场光束 3", role: "背光", quality: "硬质侧光", angles: { azimuth: -135, elevation: 45 }, distance: 1.7, beamAngle: 30, intensity: 62, temperature: 2800 },
      { name: "冷后场光束 4", role: "背光", quality: "硬质侧光", angles: { azimuth: 135, elevation: 45 }, distance: 1.7, beamAngle: 30, intensity: 62, temperature: 8500 },
    ],
  },
  {
    id: "stage-silhouette", scene: "舞台演出", label: "舞台剪影", summary: "3 灯 · 强背光造型", lights: [
      { name: "强力舞台背光 1", role: "背光", quality: "聚光", angles: { azimuth: -180, elevation: 45 }, distance: 1.6, beamAngle: 55, intensity: 88, temperature: 7600 },
      { name: "左侧低位光 2", role: "侧光", quality: "硬质侧光", angles: { azimuth: -90, elevation: -15 }, distance: 1.8, beamAngle: 35, intensity: 16, temperature: 3200 },
      { name: "右侧低位光 3", role: "侧光", quality: "硬质侧光", angles: { azimuth: 90, elevation: -15 }, distance: 1.8, beamAngle: 35, intensity: 16, temperature: 6800 },
    ],
  },
];

const directionCopy: Record<Direction, string> = {
  左侧: "画面左侧", 左前侧: "相机左前侧", 正前方: "相机正前方",
  右前侧: "相机右前侧", 右侧: "画面右侧", 顶部: "主体正上方",
  底部: "主体正下方", 后方: "主体后方",
};

const lightTypeCopy: Record<LightType, string> = {
  大面积柔光: "超大面积漫射柔光，边缘过渡宽而细腻，阴影柔和但保留体积",
  窗光: "具有明确方向性的自然窗光，柔中带形，呈现真实空间衰减",
  聚光: "受控聚光，光束集中、边界清晰但不过硬，突出视觉中心",
  硬质侧光: "较小光源形成的硬质定向光，阴影边界利落，增强结构张力",
  顶柔光: "顶部大面积柔光，均匀覆盖并向下自然衰减",
};

const sceneTone: Record<Scene, string> = {
  电影人像: "以真实电影摄影的人物塑形为目标，光线克制、立体、具有自然皮肤与材质响应",
  室内叙事: "以真实室内叙事摄影为目标，全部灯光必须符合现场空间与可见光源逻辑",
  夜景氛围: "以低调夜景电影摄影为目标，暗部深沉但不死黑，高光集中且不过曝",
  产品静物: "以高端商业静物摄影为目标，准确呈现物体体积、轮廓与材质反射",
  舞台演出: "以专业舞台灯光设计为目标，兼顾演员可见度、形体塑造、空间层次、色彩氛围与光束控制",
};

const roleIntent: Record<LightRole, string> = {
  主光: "作为主要曝光和阴影方向的基准，负责主体核心塑形",
  辅光: "只抬起主光形成的暗部，保留阴影方向，不形成第二道主影",
  轮廓光: "主要勾勒发丝、肩线或物体外缘，不正面洗亮主体",
  背光: "从后方分离主体与背景，保持主体正面的原有明暗结构",
  侧光: "强调侧面结构、体积与表面纹理，保留清晰的明暗分界",
  顶光: "从上向下建立顶部亮区与自然下落阴影",
  底光: "作为受控的低位效果光，只影响朝下表面和下缘区域",
  背景光: "主要作用于背景和空间层次，不替代主体主光",
  追光: "集中锁定主体视觉中心，控制溢光并保持周围区域相对压暗",
  效果光: "作为局部色彩或氛围点缀，服从主要曝光关系",
};

const makeDefaultLight = (): LightConfig => ({
  id: "light-1", name: "主光 1", role: "主光", quality: "大面积柔光",
  angles: { ...directionAngles.正前方 }, distance: 1.6, beamAngle: 70, intensity: 48, temperature: 4600, enabled: true,
});

const directionFromAngles = ({ azimuth, elevation }: Angles): Direction => {
  if (elevation >= 67.5) return "顶部";
  if (elevation <= -67.5) return "底部";
  const normalized = ((azimuth + 180) % 360 + 360) % 360 - 180;
  if (Math.abs(normalized) >= 135) return "后方";
  if (normalized <= -67.5) return "左侧";
  if (normalized < -22.5) return "左前侧";
  if (normalized >= 67.5) return "右侧";
  if (normalized > 22.5) return "右前侧";
  return "正前方";
};

const tempName = (temp: number) => temp < 3400 ? "暖琥珀色" : temp < 4600 ? "暖中性色" : temp < 5800 ? "自然中性白" : temp < 7200 ? "清冷日光色" : "冷蓝月光色";
const tempCss = (temp: number) => temp < 3400 ? "#ffad62" : temp < 4700 ? "#ffd8ae" : temp < 6000 ? "#f6f5ec" : temp < 7400 ? "#c8ddff" : "#8db6ff";
const strengthName = (value: number) => value <= 25 ? "轻微" : value <= 45 ? "克制" : value <= 70 ? "明确" : "强烈";
const distanceName = (value: number) => value <= 1.3 ? "近距离，衰减较明显" : value <= 2 ? "中距离，塑形与覆盖平衡" : "远距离，覆盖更均匀、衰减更平缓";
const beamName = (value: number) => value <= 30 ? "极窄聚光" : value <= 50 ? "窄束" : value <= 80 ? "中等束角" : value <= 110 ? "宽束" : "大范围泛光";
const elevationName = (value: number) => value >= 82.5 ? "正上方" : value >= 37.5 ? "高位" : value > 7.5 ? "略高位" : value >= -7.5 ? "与主体近似同高" : value > -37.5 ? "略低位" : value > -82.5 ? "低位" : "正下方";
const backgroundExposureCopy = (value: number) => value === 0
  ? "背景曝光保持与原图一致"
  : value > 0
    ? `背景相对主体提亮约 ${value}%`
    : `背景相对主体压暗约 ${Math.abs(value)}%`;
const matchesPreset = (light: LightConfig, preset: LightPreset) => light.role === preset.role
  && light.quality === preset.quality
  && light.angles.azimuth === preset.angles.azimuth
  && light.angles.elevation === preset.angles.elevation
  && light.distance === preset.distance
  && light.beamAngle === preset.beamAngle
  && light.intensity === preset.intensity
  && light.temperature === preset.temperature;
const matchesGroupPreset = (lights: LightConfig[], preset: LightGroupPreset) => lights.length === preset.lights.length
  && preset.lights.every((presetLight, index) => {
    const light = lights[index];
    return light.enabled && light.name === presetLight.name && light.role === presetLight.role && light.quality === presetLight.quality
      && light.angles.azimuth === presetLight.angles.azimuth && light.angles.elevation === presetLight.angles.elevation
      && light.distance === presetLight.distance && light.beamAngle === presetLight.beamAngle
      && light.intensity === presetLight.intensity && light.temperature === presetLight.temperature;
  });

export default function Home() {
  const [scene, setScene] = useState<Scene>("电影人像");
  const [lights, setLights] = useState<LightConfig[]>([makeDefaultLight()]);
  const [selectedLightId, setSelectedLightId] = useState("light-1");
  const [contrast, setContrast] = useState(3);
  const [ambient, setAmbient] = useState(true);
  const [background, setBackground] = useState(-12);
  const [atmosphere, setAtmosphere] = useState("轻微空气透视");
  const [protect, setProtect] = useState(true);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("lights");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [customRig, setCustomRig] = useState(true);
  const selectedLight = lights.find((light) => light.id === selectedLightId) ?? lights[0];
  const activeLightPreset = selectedLight ? lightPresets.find((preset) => matchesPreset(selectedLight, preset)) : undefined;
  const availableGroupPresets = lightGroupPresets.filter((preset) => preset.scene === scene);
  const activeGroupPreset = customRig ? undefined : availableGroupPresets.find((preset) => matchesGroupPreset(lights, preset));

  const updateLight = (lightId: string, patch: Partial<LightConfig>) => {
    setCustomRig(true);
    setLights((current) => current.map((light) => light.id === lightId ? { ...light, ...patch, angles: patch.angles ? { ...patch.angles } : light.angles } : light));
  };

  const applyLightPreset = (preset: LightPreset) => {
    if (!selectedLight) return;
    const sequence = Number(selectedLight.id.split("-").pop()) || 1;
    updateLight(selectedLight.id, {
      name: `${preset.label} ${sequence}`, role: preset.role, quality: preset.quality, angles: { ...preset.angles },
      distance: preset.distance, beamAngle: preset.beamAngle, intensity: preset.intensity, temperature: preset.temperature,
    });
  };

  const applyLightGroupPreset = (preset: LightGroupPreset) => {
    const nextLights: LightConfig[] = preset.lights.map((light, index) => ({
      ...light, id: `light-${index + 1}`, enabled: true, angles: { ...light.angles },
    }));
    setLights(nextLights);
    setSelectedLightId(nextLights[0].id);
    setCustomRig(false);
  };

  const applyCustomRig = () => {
    const frontKey = makeDefaultLight();
    setLights([frontKey]);
    setSelectedLightId(frontKey.id);
    setCustomRig(true);
  };

  const addLight = () => {
    if (lights.length >= 8) return;
    const sequence = lights.reduce((max, light) => Math.max(max, Number(light.id.split("-").pop()) || 0), 0) + 1;
    const id = `light-${sequence}`;
    const role: LightRole = lights.some((light) => light.role === "辅光") ? "效果光" : "辅光";
    const light: LightConfig = {
      id, name: `${role} ${sequence}`, role, quality: role === "效果光" ? "聚光" : "大面积柔光",
      angles: { ...addLightAngles[(sequence - 2) % addLightAngles.length] }, distance: addLightDistances[(sequence - 2) % addLightDistances.length],
      beamAngle: role === "辅光" ? 95 : 45, intensity: role === "辅光" ? 26 : 34,
      temperature: role === "辅光" ? 5200 : 6200, enabled: true,
    };
    setCustomRig(true);
    setLights((current) => [...current, light]);
    setSelectedLightId(id);
  };

  const deleteLight = (lightId: string) => {
    if (lights.length <= 1) return;
    const index = lights.findIndex((light) => light.id === lightId);
    const remaining = lights.filter((light) => light.id !== lightId);
    setCustomRig(true);
    setLights(remaining);
    if (selectedLightId === lightId) setSelectedLightId(remaining[Math.min(index, remaining.length - 1)].id);
  };

  const prompt = useMemo(() => {
    const activeLights = lights.filter((light) => light.enabled);
    const primaryLight = activeLights.find((light) => light.role === "主光")
      ?? activeLights.find((light) => light.role === "追光")
      ?? activeLights.reduce<LightConfig | undefined>((strongest, light) => !strongest || light.intensity > strongest.intensity ? light : strongest, undefined);
    const lightBlocks = activeLights.length ? activeLights.map((light, index) => {
      const direction = directionFromAngles(light.angles);
      const distance = light.distance ?? 1.6;
      const beamAngle = light.beamAngle ?? 70;
      return `[L${index + 1}] ${light.name}｜${light.role}\n- 用途：${roleIntent[light.role]}。\n- 光位：${directionCopy[direction]}、${elevationName(light.angles.elevation)}；相机坐标为水平角 ${Math.round(light.angles.azimuth)}°、高度角 ${Math.round(light.angles.elevation)}°。\n- 距离：距主体中心约 ${distance.toFixed(1)}m（${distanceName(distance)}）。\n- 光束：开角 ${beamAngle}°（${beamName(beamAngle)}）。\n- 输出：相对亮度 ${light.intensity}%（${strengthName(light.intensity)}）；色温 ${light.temperature}K（${tempName(light.temperature)}）；光质为${lightTypeCopy[light.quality]}。`;
    }).join("\n\n") : "不添加主动光源，仅依据原图已有环境光完成自然曝光整理。";
    const hierarchy = primaryLight
      ? `“${primaryLight.name}”是主曝光与阴影方向基准；其余灯光只履行各自角色，并服从这一主次关系。`
      : "不建立额外主光，保持原场景已有的光线方向。";
    const imageLock = protect
      ? "严格保持原画幅、裁切、构图、机位、焦段、景别、透视、景深、背景结构和全部空间关系；严格保持人物身份、五官、表情、姿态、妆发、服装、道具，以及所有物体的位置、大小、数量、形状、颜色和材质纹理。"
      : "保持原始画幅、构图、人物身份、主体、背景结构和物体位置，只允许照明表现发生变化。";

    return `【任务｜只重打光】\n以输入图片为唯一视觉与结构参考，只重新计算照明、曝光、色温和光线氛围；输出必须仍是同一张照片、同一机位、同一瞬间。${sceneTone[scene]}。\n\n【最高优先级｜画面锁定】\n${imageLock}\n\n【坐标约定】\n全部位置均以相机视角为参照：水平角 0° = 相机正前方，负角 = 画面左侧，正角 = 画面右侧，±180° = 主体后方；高度角 +90° = 主体正上方，-90° = 主体正下方。以下数值是照明约束，不是需要画进图像的文字或物体。\n\n【灯光层级】\n仅使用以下 ${activeLights.length} 盏已启用的独立画外光源。${hierarchy}不自动补灯，不复制、镜像或对称化任何灯位。成片只呈现照明结果，不呈现灯具、光球、轨道、控制网格、角度标签或参数文字。\n\n${lightBlocks}\n\n【全局合成】\n- 明暗关系：主体亮面与暗面曝光比约 ${contrast}:1；保留阴影层次和颜色，避免大平光、漂白高光与死黑暗部。\n- 环境光：${ambient ? "保留原场景环境光，并让它与全部画外灯共享一致的黑位、色彩反弹、空气感和衰减逻辑" : "压低原场景环境杂光，让上述画外灯成为清晰且可追溯的照明来源"}。\n- 背景：${backgroundExposureCopy(background)}；仅调整明度关系，保持背景内容、颜色结构和空间透视。\n- 空气感：${atmosphere}；只增强空间深度与光线层次，不生成遮挡主体的烟雾实体。\n\n【物理一致性】\n依据原图的三维深度、遮挡和材质重新计算受光。每盏灯产生的高光、漫反射、接触阴影、投影方向、反射光、色彩溢出和边缘光必须与其光位一致；多灯叠加后只保留一套连贯的明暗逻辑，不出现无来源提亮或互相矛盾的阴影。皮肤保持真实肤质，织物、皮革、金属、玻璃、木材和墙面保持各自正确的粗糙度与反射特征。\n\n【输出要求】\n保持原图分辨率、画幅和自然摄影质感。只改变光照，不重绘画面内容；画面中不新增灯具、光源实体、文字、字幕、水印或原图不存在的物体。避免塑料皮肤、抠像边缘、贴图感、过度 HDR、锐化光晕、色带和不自然光斑。${note.trim() ? `\n\n【补充要求｜不得覆盖画面锁定与灯光参数】\n${note.trim()}` : ""}`;
  }, [scene, lights, contrast, ambient, background, atmosphere, protect, note]);

  const reset = () => {
    setScene("电影人像"); setLights([makeDefaultLight()]); setSelectedLightId("light-1"); setContrast(3);
    setAmbient(true); setBackground(-12); setAtmosphere("轻微空气透视"); setProtect(true); setNote(""); setCustomRig(true);
  };

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(prompt); }
    catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt; textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); textarea.remove();
    }
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadPrompt = () => {
    const url = URL.createObjectURL(new Blob([prompt], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "AI重打光提示词.txt"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <main className="studio-shell">
    <section className="canvas-workspace" aria-label="多灯三维光位工作区">
      <div className="studio-brand"><span>RL</span><strong>RELIGHT LAB</strong></div>
      <div className="scene-switcher" aria-label="创作场景">{scenes.map((item) => <button key={item} className={scene === item ? "active" : ""} onClick={() => { setScene(item); setCustomRig(true); }}>{item}</button>)}</div>
      <LightFieldCanvas lights={lights} selectedLightId={selectedLightId} snapEnabled={snapEnabled} onSelect={setSelectedLightId} onMove={(id, angles) => updateLight(id, { angles })} onResetSelected={() => selectedLight && updateLight(selectedLight.id, { angles: { ...directionAngles.左前侧 } })} />
      <div className="privacy-note"><span className="status-dot" />本地运行 · 图片不上传</div>
    </section>

    <aside className="floating-sidebar" aria-label="灯光参数控制栏">
      <header className="sidebar-header"><div><span>当前工程</span><strong>{scene}</strong></div><span className="light-count">{lights.length} / 8 盏</span></header>
      <div className="sidebar-tabs" role="tablist" aria-label="控制栏分类">
        <button role="tab" aria-selected={sidebarTab === "lights"} className={sidebarTab === "lights" ? "active" : ""} onClick={() => setSidebarTab("lights")}>灯光</button>
        <button role="tab" aria-selected={sidebarTab === "global"} className={sidebarTab === "global" ? "active" : ""} onClick={() => setSidebarTab("global")}>全局</button>
        <button role="tab" aria-selected={sidebarTab === "prompt"} className={sidebarTab === "prompt" ? "active" : ""} onClick={() => setSidebarTab("prompt")}>提示词</button>
      </div>

      <div className="sidebar-scroll">
        {sidebarTab === "lights" && <div className="sidebar-section" role="tabpanel">
          <div className="light-rig-heading"><div><strong>灯光列表</strong><small>选择一盏灯后调整参数</small></div><button className="add-light-button" onClick={addLight} disabled={lights.length >= 8}>添加灯光</button></div>
          <div className="rig-preset-panel"><div className="rig-preset-heading"><span>多光源预设</span><em>{scene} · 点击后替换灯组</em></div><div className="rig-preset-grid"><button className={!activeGroupPreset ? "active" : ""} aria-pressed={!activeGroupPreset} onClick={applyCustomRig}><strong>自定义</strong><small>1 灯 · 正面主光</small></button>{availableGroupPresets.map((preset) => <button key={preset.id} className={activeGroupPreset?.id === preset.id ? "active" : ""} aria-pressed={activeGroupPreset?.id === preset.id} onClick={() => applyLightGroupPreset(preset)}><strong>{preset.label}</strong><small>{preset.summary}</small></button>)}</div></div>
          <div className="light-list">{lights.map((light) => <div key={light.id} className={`light-list-row ${selectedLightId === light.id ? "selected" : ""} ${!light.enabled ? "off" : ""}`}>
            <button className="light-select-button" onClick={() => setSelectedLightId(light.id)}><i style={{ "--light-color": tempCss(light.temperature) } as React.CSSProperties} /><span><strong>{light.name}</strong><small>距离 {(light.distance ?? 1.6).toFixed(1)}m · 光束 {light.beamAngle ?? 70}° · {light.intensity}%</small></span></button>
            <label className="mini-toggle" title={light.enabled ? "关闭灯光" : "启用灯光"}><input type="checkbox" checked={light.enabled} onChange={(event) => updateLight(light.id, { enabled: event.target.checked })} /><i /></label>
            <button className="delete-light-button" aria-label={`删除 ${light.name}`} disabled={lights.length <= 1} onClick={() => deleteLight(light.id)}>删除</button>
          </div>)}</div>

          {selectedLight && <section className="selected-light-editor">
            <div className="selected-light-heading"><div><span>当前选中</span><strong>{selectedLight.name}</strong></div><label className="switch-row compact"><span><strong>{selectedLight.enabled ? "已启用" : "已关闭"}</strong><small>关闭后不写入提示词</small></span><input type="checkbox" checked={selectedLight.enabled} onChange={(event) => updateLight(selectedLight.id, { enabled: event.target.checked })} /><i /></label></div>
            <label className="light-name-field"><span>灯光名称</span><input value={selectedLight.name} maxLength={16} onChange={(event) => updateLight(selectedLight.id, { name: event.target.value || "未命名灯光" })} /></label>
            <div className="control-group light-preset-group"><div className="group-title"><span>光源预设</span><em>一次同步全部参数</em></div><div className="option-grid light-preset-grid">{lightPresets.map((preset) => <button key={preset.label} className={activeLightPreset?.label === preset.label ? "active" : ""} aria-pressed={activeLightPreset?.label === preset.label} onClick={() => applyLightPreset(preset)}><strong>{preset.label}</strong><small>{preset.summary}</small></button>)}</div></div>
            <div className="control-group distance-group"><div className="group-title"><span>光源距离</span><em>直接改变当前灯的球体半径</em></div><RangeControl label="球体半径" value={selectedLight.distance ?? 1.6} min={0.9} max={2.8} step={0.1} suffix="m" display={`${(selectedLight.distance ?? 1.6).toFixed(1)}m`} onChange={(distance) => updateLight(selectedLight.id, { distance })} /></div>
            <div className="control-group beam-range-group"><div className="group-title"><span>光束范围</span><em>调整光束覆盖宽度</em></div><RangeControl label="光束开角" value={selectedLight.beamAngle ?? 70} min={20} max={140} step={5} suffix="°" onChange={(beamAngle) => updateLight(selectedLight.id, { beamAngle })} /></div>
            <div className="control-group"><div className="group-title"><span>灯光方向</span><em>与三维光点精确同步</em></div><label className="switch-row snap-switch"><span><strong>点位吸附</strong><small>拖动时吸附到 15° 网格与上下极点</small></span><input type="checkbox" checked={snapEnabled} onChange={(event) => setSnapEnabled(event.target.checked)} /><i /></label><div className="option-grid direction-grid">{directions.map((direction) => <button key={direction} className={directionFromAngles(selectedLight.angles) === direction ? "active" : ""} onClick={() => updateLight(selectedLight.id, { angles: { ...directionAngles[direction] } })}>{direction}</button>)}</div></div>
            <div className="control-group"><div className="group-title"><span>灯光光质</span><em>每盏灯独立设置</em></div><div className="option-grid light-grid">{lightTypes.map((quality) => <button key={quality} className={selectedLight.quality === quality ? "active" : ""} onClick={() => updateLight(selectedLight.id, { quality })}>{quality}</button>)}</div></div>
            <RangeControl label="亮度" value={selectedLight.intensity} min={0} max={100} suffix="%" onChange={(intensity) => updateLight(selectedLight.id, { intensity })} />
            <RangeControl label="色温" value={selectedLight.temperature} min={2500} max={9000} step={100} suffix="K" onChange={(temperature) => updateLight(selectedLight.id, { temperature })} />
            <div className="angle-readout"><span>水平角 <b>{Math.round(selectedLight.angles.azimuth)}°</b></span><span>高度角 <b>{Math.round(selectedLight.angles.elevation)}°</b></span></div>
          </section>}
        </div>}

        {sidebarTab === "global" && <div className="sidebar-section global-settings" role="tabpanel">
          <div className="section-heading"><strong>全局融合</strong><small>作用于全部已启用灯光</small></div>
          <RangeControl label="明暗光比" value={contrast} min={1} max={8} suffix="" display={`${contrast}:1`} onChange={setContrast} />
          <RangeControl label="背景曝光" value={background} min={-40} max={20} suffix="%" display={`${background > 0 ? "+" : ""}${background}%`} onChange={setBackground} />
          <label className="switch-row"><span><strong>环境光融合</strong><small>统一黑位与色彩污染</small></span><input type="checkbox" checked={ambient} onChange={(event) => setAmbient(event.target.checked)} /><i /></label>
          <div className="control-group"><div className="group-title"><span>空气氛围</span><em>不改变场景内容</em></div><select value={atmosphere} onChange={(event) => setAtmosphere(event.target.value)}><option>无额外空气效果</option><option>轻微空气透视</option><option>轻薄体积光层次</option><option>潮湿夜景空气感</option><option>微尘可见光束</option></select></div>
          <label className="protect-card"><input type="checkbox" checked={protect} onChange={(event) => setProtect(event.target.checked)} /><span><strong>严格锁定原图内容与结构</strong><small>构图、背景、人物、服装、道具、透视和景深均不改变</small></span></label>
          <button className="reset-button" onClick={reset}>重置为单主光</button>
        </div>}

        {sidebarTab === "prompt" && <div className="sidebar-section prompt-section" role="tabpanel">
          <div className="section-heading prompt-heading"><div><strong>生成结果</strong><small>所有参数已实时同步</small></div><span className="live-badge">实时</span></div>
          <div className="prompt-summary"><span>{scene}</span><span>{lights.filter((light) => light.enabled).length} 盏启用</span><span>{selectedLight?.temperature}K</span><span>光比 {contrast}:1</span></div>
          <div className="prompt-output" tabIndex={0} aria-label="生成的多灯光提示词"><pre>{prompt}</pre></div>
          <div className="note-block"><label htmlFor="extra-note">补充要求 <span>可选</span></label><textarea id="extra-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：第二盏灯只作用于背景……" /></div>
          <div className="action-row"><button className="secondary-button" onClick={downloadPrompt}>下载 TXT</button><button className="primary-button" onClick={copyPrompt}>{copied ? "已复制" : "复制完整提示词"}</button></div>
        </div>}
      </div>
    </aside>
  </main>;
}

function LightFieldCanvas({ lights, selectedLightId, snapEnabled, onSelect, onMove, onResetSelected }: { lights: LightConfig[]; selectedLightId: string; snapEnabled: boolean; onSelect: (id: string) => void; onMove: (id: string, angles: Angles) => void; onResetSelected: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Relight3DController | null>(null);
  const selectRef = useRef(onSelect); const moveRef = useRef(onMove);
  const initialSceneRef = useRef({ lights, selectedLightId, snapEnabled });
  const [view, setView] = useState<RelightView>("perspective");
  const [interaction, setInteraction] = useState<RelightInteraction>("idle");
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => { selectRef.current = onSelect; moveRef.current = onMove; }, [onSelect, onMove]);

  useEffect(() => {
    if (!stageRef.current) return;
    let disposed = false;
    try {
      controllerRef.current = createRelight3D(stageRef.current, {
        lights: initialSceneRef.current.lights,
        selectedLightId: initialSceneRef.current.selectedLightId,
        snapEnabled: initialSceneRef.current.snapEnabled,
        onLightSelect: (id) => selectRef.current(id),
        onLightChange: (id, angles) => moveRef.current(id, angles),
        onInteractionChange: setInteraction,
      });
    } catch {
      const timer = window.setTimeout(() => { if (!disposed) setWebglUnavailable(true); }, 0);
      return () => { disposed = true; window.clearTimeout(timer); };
    }
    return () => { disposed = true; controllerRef.current?.destroy(); controllerRef.current = null; };
  }, []);
  useEffect(() => controllerRef.current?.setLights(lights), [lights]);
  useEffect(() => controllerRef.current?.setSelectedLight(selectedLightId), [selectedLightId]);
  useEffect(() => controllerRef.current?.setSnapEnabled(snapEnabled), [snapEnabled]);
  const selected = lights.find((light) => light.id === selectedLightId) ?? lights[0];
  const chooseView = (next: RelightView) => { setView(next); controllerRef.current?.setView(next); };
  const interactionCopy = interaction === "light" ? `正在移动 ${selected?.name}` : interaction === "globe" ? "正在旋转球体" : "点击光点可切换选择";

  return <div className={`light-field interaction-${interaction}`}>
    <div className="light-field-toolbar"><div><strong>多灯三维光位控制</strong><span>每盏灯独立距离球 · {snapEnabled ? "光点吸附 15° 网格" : "光点自由移动"}</span></div><div className="view-switch"><button className={view === "perspective" ? "active" : ""} onClick={() => chooseView("perspective")}>透视</button><button className={view === "front" ? "active" : ""} onClick={() => chooseView("front")}>正面</button></div></div>
    <div ref={stageRef} className="webgl-stage"><div className={`webgl-loading ${webglUnavailable ? "unavailable" : ""}`}>{webglUnavailable ? <span><strong>此浏览器未启用 WebGL</strong><small>请用已开启硬件加速的现代浏览器打开，其他提示词功能仍可使用。</small></span> : "正在建立多灯三维光场…"}</div><div className="axis-label axis-top">TOP</div><div className="axis-label axis-left">L</div><div className="axis-label axis-right">R</div></div>
    <div className="light-field-status"><span><b>{selected?.name}</b> · 距离 {(selected?.distance ?? 1.6).toFixed(1)}m · 光束 {selected?.beamAngle ?? 70}°</span><span>{interactionCopy} · {lights.length} 个独立球体</span><div className="field-actions"><button onClick={() => controllerRef.current?.resetView()}>复位视角</button><button onClick={onResetSelected}>复位当前光位</button></div></div>
  </div>;
}

function RangeControl({ label, value, min, max, step = 1, suffix, display, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; display?: string; onChange: (value: number) => void }) {
  const position = ((value - min) / (max - min)) * 100;
  return <div className="range-row"><div className="range-label"><strong>{label}</strong></div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range-position": `${position}%` } as React.CSSProperties} aria-label={label} /><output>{display ?? `${value}${suffix}`}</output></div>;
}
